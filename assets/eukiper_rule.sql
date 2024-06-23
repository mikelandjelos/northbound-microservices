-- avg_temp_greater_than_30
SELECT device,
    avg(carbon_oxide) AS avg_carbon_oxide,
    avg(humidity) AS avg_humidity,
    avg(liquid_petroleum_gas) AS avg_liquid_petroleum_gas,
    avg(smoke) AS avg_smoke,
    avg(temperature) AS avg_temperature
FROM measurements_stream
GROUP BY device,
    TUMBLINGWINDOW(ss, 5)
HAVING avg_temperature > 30;