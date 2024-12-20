const debug = require('debug')('laser:mqtt')
const mqtt = require('mqtt')

const config = require('./config')

// MQTT variables
let maintenanceStatus = 'ok' // Default status is 'ok'

const mqttTopic = config.mqttTopic ?? 'laser/maintenance'

if (process.env.NODE_ENV !== 'test') {
  // MQTT setup
  const mqttClient = mqtt.connect(
    config.mqttServer ?? 'mqtt://127.0.0.1',
    config.mqttOptions
  ) // VHS Public Facing MQTT. Should eventually be changed to a private mqtt instance.

  mqttClient.on('connect', () => {
    debug('Connected to MQTT broker')

    mqttClient.subscribe(mqttTopic, (err) => {
      if (err) {
        console.error(`Failed to subscribe to topic: ${mqttTopic}`)
      } else {
        debug(`Subscribed to MQTT topic: ${mqttTopic}`)
      }
    })
  })

  mqttClient.on('message', (topic, message) => {
    if (topic === mqttTopic) {
      maintenanceStatus = message.toString() // Read the message and store it

      debug(`Received message on ${mqttTopic}: ${maintenanceStatus}`)
    }
  })

  mqttClient.on('error', (err) => {
    console.error('MQTT error:', err)
  })
}

module.exports = { maintenanceStatus }
