const express = require('express');
const {Datastore} = require('@google-cloud/datastore')

const app = express();

const server = app.listen(8080, '0.0.0.0', () => {
    let addressObject = server.address();
    let {address, port} = addressObject;

    console.log(`Server is listening on ${address}:${port}`);
});

const projectId = 'myprojecttutorial-235717';
const datastore = new Datastore({
    projectId: projectId
});

const lightRange = [
    {hour:18, chance: 90}, 
    {hour:19, chance: 100}, 
    {hour:20, chance: 90}, 
    {hour:21, chance: 80}, 
    {hour:22, chance: 60}, 
    {hour:23, chance: 40}, 
    {hour:24, chance: 20}, 
    {hour:0, chance: 10}, 
    {hour:1, chance: 10}, 
    {hour:2, chance: 10}, 
    {hour:3, chance: 10}, 
    {hour:4, chance: 20}, 
    {hour:5, chance: 35}, 
    {hour:6, chance: 70}, 
];

let lightRangeChances = [];
lightRange.forEach((range) => {
    lightRangeChances[range.hour] = range.chance;
});

const totalSecondsInDay = 24 * 60 * 60;
const generatedDataFrequencyInSeconds = 15;
const startSimulateDataTime = new Date("02/04/2019");

let simulatedData = [];

app.get("/generate", (req, res, next) => {
    // Generate from 0 to 24 of date 2/4/2019
    // Simulate data of every 15 secs

    simulatedData = [];
    let count = 0;
    let countOn = 0;

    let secondOfDay = 0;
    while(secondOfDay < totalSecondsInDay){
        let dateTime = new Date(startSimulateDataTime.getTime() + secondOfDay * 1000);
        let hourOfDay = dateTime.getHours();

        let randomLightValue = Math.ceil(Math.random() * 100);
        let lightChance = lightRangeChances[hourOfDay] | 0;
        let lightOn = randomLightValue < lightChance;
        
        let data = {
            kind: 'SensorHistory',
            dateTime: dateTime,
            lightOn: lightOn
        };

        simulatedData.push(data);

        secondOfDay += generatedDataFrequencyInSeconds;
        count++;

        if(lightOn) {
            countOn++;
        }
    };

    res.json({
        success: true,
        points: count,
        on: countOn,
    });
});

app.get("/statistic", (req, res, next) => {
    let usageCountByHour = [];

    for(let hour = 0; hour < 24; hour++){
        usageCountByHour[hour] = [];
    }

    if(simulatedData.length === 0) {
        res.json({
            error: {
                message: "No data found."
            }
        });
        return;
    }

    simulatedData.forEach(data => {
        let hourOfDay = data.dateTime.getHours();
        let normalLight = typeof lightRangeChances[hourOfDay] !== 'undefined';
        let smartLight = data.lightOn;

        usageCountByHour[hourOfDay].push({
            normalLight: normalLight,
            smartLight: smartLight
        });
    });

    let resultByHour = [];
    for(let hour = 0; hour < 24; hour++){
        resultByHour[hour] = {
            normalLight: usageCountByHour[hour].reduce((sum, current) => {
                if(current.normalLight){
                    return sum + 1;
                }
                return sum;
            }, 0),
            smartLight: usageCountByHour[hour].reduce((sum, current) => {
                if(current.smartLight)
                    return sum + 1;
                return sum;
            }, 0),
        };
        
        resultByHour[hour].reducedRatio = resultByHour[hour].smartLight / resultByHour[hour].normalLight;

        if(resultByHour[hour].normalLight === 0) {
            resultByHour[hour].reducedRatio = 0;
        }
    }

    let resultTotal = {
        normalLight: resultByHour.reduce((sum, current) => {
            return sum + current.normalLight;
        }, 0),
        smartLight: resultByHour.reduce((sum, current) => {
            return sum + current.smartLight;
        }, 0),
        byHours: resultByHour,
    };

    resultTotal.reducedRatio = resultTotal.smartLight / resultTotal.normalLight;

    res.json(resultTotal);
});