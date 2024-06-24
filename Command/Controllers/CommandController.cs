using Microsoft.AspNetCore.Mvc;
using Command.Services;
using System.Net.WebSockets;
using System.Text;
using System.Net;
using System.Text.RegularExpressions;
using DotNetEnv;

namespace Command.Controllers;

[Route("[controller]")]
public class CommandController : ControllerBase
{
    private readonly MqttService _mqttService;
    private readonly ILogger<CommandController> _logger;

    public CommandController(MqttService mqttService, ILogger<CommandController> logger)
    {
        _mqttService = mqttService;
        _logger = logger;
    }

    [HttpGet("subscribe/{deviceMac}")]
    public async Task Subscribe(string deviceMac)
    {
        string baseTopic = Environment.GetEnvironmentVariable("BASE_TOPIC") ?? Env.GetString("BASE_TOPIC");
        
        string topic = $"{baseTopic}/{WebUtility.UrlDecode(deviceMac)}";
        _logger.LogCritical($"Topic to subscribe to: {topic}");

        if (deviceMac == "#" || IsValidMacAddress(deviceMac))
        {
            if (HttpContext.WebSockets.IsWebSocketRequest)
            {
                WebSocket webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();
                await HandleWebSocketConnection(webSocket, topic);
            }
            else
            {
                HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            }
        }
        else
        {
            _logger.LogWarning($"Invalid topic: {topic}");
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
        }
    }

    private bool IsValidMacAddress(string macAddress)
    {
        var macRegex = new Regex(@"^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$");
        return macRegex.IsMatch(macAddress);
    }

    private async Task HandleWebSocketConnection(WebSocket webSocket, string topic)
    {
        Func<string, string, Task> observer = async (receivedTopic, message) =>
        {
            var msg = Encoding.UTF8.GetBytes(message);
            await webSocket.SendAsync(new ArraySegment<byte>(msg), WebSocketMessageType.Text, true, CancellationToken.None);
        };

        try
        {
            await _mqttService.SubscribeToTopic(topic, observer);

            var buffer = new byte[1024 * 4];
            while (webSocket.State == WebSocketState.Open)
            {
                var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    break;
                }
            }

            await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "WebSocket connection error.");
            if (webSocket.State == WebSocketState.Open || webSocket.State == WebSocketState.CloseReceived)
            {
                await webSocket.CloseAsync(WebSocketCloseStatus.InternalServerError, "Internal Server Error", CancellationToken.None);
            }
        }
        finally
        {
            await _mqttService.UnsubscribeFromTopic(topic, observer);
        }
    }
}
