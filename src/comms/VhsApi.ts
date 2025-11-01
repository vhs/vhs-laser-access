import CryptoJS from 'crypto-js'
import { config } from "../Configuration"

const requestURI = '/s/vhs/data/laser/update'

export namespace VhsApi {
    export function statusUpdate (statusStr: string) {
    const ts = Math.floor(Date.now() / 1000)

    const formData = {
        value: statusStr,
        ts: '' + ts,
        client: config.api.clientName
    }

    const jsonData = JSON.stringify(formData)

    // sign the request data
    const key = ts + jsonData + config.api.clientSecret
    const hash = CryptoJS.HmacSHA256(jsonData, key)

    // put the value in the params as well, because the API expects it
    const query = new URLSearchParams({
      hash: hash.toString(),
      value: statusStr,
    });

    const signedRequestUrl = `${config.api.baseUrl}${requestURI}?${query}`;

    return fetch(signedRequestUrl, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: jsonData
    }).then((response) => response.json())
  }
}
