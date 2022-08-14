'use strict';

const HELPER_BASE = process.env.HELPER_BASE || "/opt/";
const Response = require(HELPER_BASE + 'response');

const SWITCHBOT_OPENTOKEN = "【SwitchBotトークン】";
const SwitchBot = require('./switchbot');
const switchbot = new SwitchBot(SWITCHBOT_OPENTOKEN);
const SWITCHBOT_DEVICE_ID = "【SwitchBotデバイスID】";

const snmp = require ("net-snmp");
const fetch = require('node-fetch');
const Headers = fetch.Headers;

const base_url = '【立ち上げたNode.jsサーバのURL】';

const SNMP_AGENT_HOST = "【監視対象のSNMPエージェントのホスト名】";
const SNMP_TARGET_OID = "【監視対象のSNMPのOID"; /* 1.3.6.1.4.1.6574.1.2.0 など */

// switchbot.getDeviceList()
// .then(async json =>{
//   console.log(json);
// });

exports.handler = async (event, context, callback) => {
  console.log('cron is invoked');

  try{
    var json = await switchbot.getDeviceStatus(SWITCHBOT_DEVICE_ID);
    var params = {
      channel: 'switchbot',
      data:{
        temperature: json.temperature,
        humidity: json.humidity,
      }
    };
    var result = await do_post(base_url + '/datum-add-data', params);
    console.log(result);
  }catch(error){
    console.log(error);
  }

  try{
    var value = await getSnmpByOid(SNMP_AGENT_HOST, SNMP_TARGET_OID);
    var params = {
      channel: 'qnap',
      data:{
        temperature: value,
      }
    };
    var result = await do_post(base_url + '/datum-add-data', params);
    console.log(result);
  }catch(error){
    console.log(error);
  }
};

function do_post(url, body) {
  const headers = new Headers({ "Content-Type": "application/json" });

  return fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: headers
    })
    .then((response) => {
      if (!response.ok)
        throw 'status is not 200';
      return response.json();
    });
}

function getSnmpByOid(host, oid){
  var session = snmp.createSession (host, "public");
  var oids = [oid];

  return new Promise((resolve, reject) =>{
    session.get (oids, function (error, varbinds) {
      if (error) 
        return reject(error);
      var value = varbinds[0].value;
      session.close();
      resolve(value);
    });
  })
}
