import debugLib from 'debug'
import mqtt from 'mqtt'
import config from '../config.json'

const debug = debugLib('laser:mqtt')

let maintenanceStatus = 'ok'

const mqttTopic = (config as any).mqttTopic || 'laser/maintenance'

if (process.env.NODE_ENV !== 'test') {
  const mqttClient = mqtt.connect((config as any).mqttServer || 'mqtt://127.0.0.1', (config as any).mqttOptions)

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
      maintenanceStatus = message.toString()
      debug(`Received message on ${mqttTopic}: ${maintenanceStatus}`)
    }
  })

  mqttClient.on('error', (err) => {
    console.error('MQTT error:', err)
  })
}

export { maintenanceStatus }

export default { maintenanceStatus }
