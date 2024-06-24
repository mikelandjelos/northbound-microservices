FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-env
WORKDIR /Command

# Copy everything
COPY . ./
RUN dotnet --info
RUN dotnet restore
RUN dotnet publish -c Release -o out

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /Command
COPY --from=build-env /Command/out .
ENTRYPOINT ["dotnet", "Command.dll"]