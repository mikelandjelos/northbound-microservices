using DotNetEnv;
using MQTTnet;
using MQTTnet.Client;

namespace Command.Services;

public class MqttService : IDisposable
{
    private IMqttClient? _mqttClient;
    private readonly ILogger<MqttService> _logger;

    public readonly List<Func<string, string, Task>> _wildcardObservers = new();
    private readonly Dictionary<string, List<Func<string, string, Task>>> _topics = new();
    private readonly SemaphoreSlim _semaphore = new(1, 1);
    private bool _disposed;

    public MqttService(ILogger<MqttService> logger)
    {
        _logger = logger;
    }

    public async Task Connect()
    {
        await _semaphore.WaitAsync();
        try
        {
            if (_mqttClient == null || !_mqttClient.IsConnected)
            {
                _mqttClient = new MqttFactory().CreateMqttClient();

                string broker = Environment.GetEnvironmentVariable("MQTT_BROKER_HOST") ?? Env.GetString("MQTT_BROKER_HOST");
                int port = int.TryParse(Environment.GetEnvironmentVariable("MQTT_BROKER_PORT"), out var parsedBrokerPort)
                    ? parsedBrokerPort : Env.GetInt("MQTT_BROKER_PORT");

                var options = new MqttClientOptionsBuilder()
                    .WithTcpServer(broker, port)
                    .WithClientId($"command-{new Random().Next(0x1000000):X6}")
                    .WithCleanSession()
                    .Build();

                _mqttClient.ApplicationMessageReceivedAsync += HandleMessageAsync;

                try
                {
                    await _mqttClient.ConnectAsync(options);
                    _logger.LogInformation($"Connected to MQTT broker at {broker}:{port}");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to connect to MQTT broker");
                    throw;
                }
            }
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task SubscribeToTopic(string topic, Func<string, string, Task> observer)
    {
        await Connect();

        await _semaphore.WaitAsync();
        try
        {
            if (topic.EndsWith("#"))
            {
                _wildcardObservers.Add(observer);
                _logger.LogInformation($"Subscribed to new wildcard topic `{topic}`. Current number of observers {_wildcardObservers.Count}");
                await _mqttClient.SubscribeAsync(topic);
                return;
            }

            if (!_topics.ContainsKey(topic))
            {
                _topics.Add(topic, new List<Func<string, string, Task>>());
                await _mqttClient.SubscribeAsync(topic);
                _logger.LogInformation("Subscribed to new topic `{Topic}`", topic);
            }

            _topics[topic].Add(observer);
            _logger.LogInformation($"Added observer for topic `{topic}`. Current number of observers {_topics[topic].Count}.");
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task UnsubscribeFromTopic(string topic, Func<string, string, Task> observer)
    {
        await _semaphore.WaitAsync();
        try
        {
            if (topic.EndsWith("#"))
            {
                _wildcardObservers.Remove(observer);
                await _mqttClient.UnsubscribeAsync(topic);
                _logger.LogInformation($"Unsubscribed from wildcard topic `{topic}`. Current number of subscribers {_wildcardObservers.Count}");
                return;
            }

            if (_topics.TryGetValue(topic, out var observers))
            {
                observers.Remove(observer);
                _logger.LogInformation($"Unsubscribed from topic `{topic}`");

                if (observers.Count == 0)
                {
                    _topics.Remove(topic, out _);
                    await _mqttClient.UnsubscribeAsync(topic);
                    _logger.LogInformation($"Cleared out topic `{topic}`");
                }
            }
        }
        finally
        {
            _semaphore.Release();
        }
    }

    private async Task HandleMessageAsync(MqttApplicationMessageReceivedEventArgs e)
    {
        var topic = e.ApplicationMessage.Topic;
        var message = System.Text.Encoding.UTF8.GetString(e.ApplicationMessage.PayloadSegment);

        _logger.LogCritical($"Received [{topic}]: {message}");

        if (_topics.TryGetValue(topic, out var observers))
        {
            _logger.LogCritical($"Found {observers.Count} observers for topic `{topic}`");
            foreach (var observer in observers)
            {
                try
                {
                    await observer(topic, message);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error for topic `{topic}`");
                }
            }
        }
        else
        {
            _logger.LogCritical($"No observers found for topic `{topic}`");
        }

        foreach (var observer in _wildcardObservers)
        {
            try
            {
                await observer(topic, message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error for topic `{topic}`");
            }
        }
    }

    public void Dispose()
    {
        if (_disposed)
            return;

        _mqttClient?.Dispose();
        _semaphore.Dispose();
        _disposed = true;
    }
}
