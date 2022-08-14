'use strict';

const HELPER_BASE = process.env.HELPER_BASE || "/opt/";
const Response = require(HELPER_BASE + 'response');

const TOPIC_BASE = process.env.TOPIC_BASE;

const crypto = require("crypto");
const mysql = require('mysql2/promise');

let conn;

mysql.createConnection({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
})
.then(result =>{
  conn = result;
  return conn.connect()
});

exports.handler = async (event, context, callback) => {
	var body = JSON.parse(event.body);
	console.log(body);

  if( event.path == '/channel-get-list' ){
    var result = await channel_get_list(conn);
    return new Response({ list: result });
  }else
  if( event.path == '/channel-create' ){
    if( !body.name ){
      return new Response({message: 'name is empty'}, 400);
    }
    var result = await channel_create(conn, body.name, body.description, body.resources);
    return new Response({ list: result });
  }else
  if( event.path == '/channel-delete' ){
    var result = await channel_delete(conn, body.name);
    return new Response({});
  }else
  if( event.path == '/channel-update' ){
    if( !body.name ){
      return new Response({message: 'name is empty'}, 400);
    }
    var result = await channel_update(conn, body.name, body.description, body.resources);
    return new Response();
  }else
  if( event.path == '/channel-get-latest'){
    var result = await datum_get_latest(conn, body.name, body.num);
    return new Response(result);
  }else
  if( event.path == '/channel-get-data' ){
    var result = await datum_get_between(conn, body.name, body.start, body.end);
    return new Response(result);
  }else
  if( event.path == '/datum-add-data' ){
    var result = await datum_add(conn, body.channel, body.data);
    return new Response({});
  }else
  if( event.path == '/datum-add-datum' ){
    for( let data of body.datum )
      var result = await datum_add(conn, body.channel, data);
    return new Response({});
  }else
  if( event.path == '/dashboard-get-list'){
    var result = await dashboard_get_list(conn);
    return new Response({ list: result });
  }else
  if( event.path == '/dashboard-create'){
    if( !body.title ){
      return new Response({message: 'title is empty'}, 400);
    }
    var result = await dashboard_create(conn, body.title, body.description, body.widgets);
    return new Response({});
  }else
  if( event.path == '/dashboard-delete'){
    var result = await dashboard_delete(conn, body.id);
    return new Response({});
  }else
  if( event.path == '/dashboard-get-item'){
    var result = await dashboard_get_item(conn, body.id);
    return new Response(result);
  }else
  if( event.path == '/dashboard-update'){
    if( !body.title ){
      return new Response({message: 'title is empty'}, 400);
    }
    var result = await dashboard_update(conn, body.id, body.title, body.description, body.widgets);
    return new Response({});
  }
};

exports.mqtt_handler = async (event, context) => {
  console.log(event);
  console.log(context);
  if( event.topic == TOPIC_BASE + '/channel-add-data' ){
    var body = event.payload;
    console.log(body);
    var result = await datum_add(conn, body.channel, body.data);
  }else
  if( event.topic == TOPIC_BASE + '/channel-add-datum' ){
    var body = JSON.parse(event.payload);
    for( let data of body.datum )
      var result = await datum_add(conn, body.channel, data);
  }
};

exports.udp_handler = async (event, context) => {
  console.log(event);
  console.log(context);

  var body = JSON.parse(event.body);
  if( body.topic == TOPIC_BASE + '/channel-add-data' ){
    console.log('receive /channel-add-data', body.channel, body.data);
    var result = await datum_add(conn, body.channel, body.data);
  }else
  if( body.topic == TOPIC_BASE + '/channel-add-datum' ){
    console.log('receive /channel-add-datum', body.channel);
    for( let data of body.datum )
      var result = await datum_add(conn, body.channel, data);
  }
};

async function channel_create(conn, name, description, resources){
  var sql = "INSERT INTO channels (name, description, resources) VALUES(?, ?, ?)";
  var data = [name, description, JSON.stringify(resources)];
  var result = await conn.execute(sql, data);
  return result;
}

async function channel_get_item(conn, name){
  var [rows, fields] = await conn.query("SELECT * FROM channels WHERE name = ?", [name]);
  if( rows.length != 1 )
    return null;
  var channel = rows[0];
  channel.updated_at = new Date(channel.updated_at).getTime();
  channel.created_at = new Date(channel.created_at).getTime();
  channel.resources = JSON.parse(channel.resources);
  return channel;
}

async function channel_delete(conn, name){
  var sql = "DELETE FROM channels WHERE name = ?";
  var data = [name];
  var result = await conn.execute(sql, data);

  var sql = "DELETE FROM datum WHERE channel = ?";
  var data = [name];
  var result = await conn.execute(sql, data);
  return result;
}

async function channel_update(conn, name, description, resources){
  var sql = "UPDATE channels SET description = ?, resources = ? WHERE name = ?";
  var data = [description, JSON.stringify(resources), name];
  var result = await conn.execute(sql, data);
  return result;
}

async function channel_get_list(conn){
  var [rows, fields] = await conn.query("SELECT * FROM channels", []);

  for( let channel of rows ){
    channel.updated_at = new Date(channel.updated_at).getTime();
    channel.created_at = new Date(channel.created_at).getTime();
    channel.resources = JSON.parse(channel.resources);
  }
  return rows;
}

async function datum_add(conn, channel, data){
  var result = await channel_get_item(conn, channel);
  if( !result )
    throw new Error('channel not found');

  var json = {};
  for(const resource of result.resources){
    if( data[resource.name] )
    json[resource.name] = data[resource.name];
  }
  if( Object.keys(json).length <= 0 )
    return;

  var sql = "INSERT INTO datum (channel, json) VALUES(?, ?)";
  var value = [channel, JSON.stringify(json)];
  var result = await conn.execute(sql, value);
  return result;
}

async function datum_get_latest(conn, channel, limit){
  if( !limit ) limit = 1;
  var [rows, fields] = await conn.query("SELECT * FROM datum WHERE channel = ? ORDER BY created_at DESC LIMIT ?", [channel, limit]);

  for( let date of rows){
    date.created_at = new Date(date.created_at).getTime();
    date.json = JSON.parse(date.json);
  }
  return rows;
}

async function datum_get_between(conn, channel, start, end){
  var start_str = new Date(start).toLocaleString();
  var end_str = end ? new Date(end).toLocaleString() : new Date().toLocaleString();
  console.log(start_str, end_str);
  var [rows, fields] = await conn.query("SELECT * FROM datum WHERE channel = ? AND created_at BETWEEN ? AND ? ORDER BY created_at ASC", [channel, start_str, end_str]);

  for( let date of rows){
    date.created_at = new Date(date.created_at).getTime();
    date.json = JSON.parse(date.json);
  }
  return rows;
}

async function dashboard_create(conn, title, description, widgets){
  var sql = "INSERT INTO dashboards (id, title, description, widgets) VALUES(?, ?, ?, ?)";
  var data = [crypto.randomUUID(), title, description, JSON.stringify(widgets)];
  var result = await conn.execute(sql, data);
  return result;
}

async function dashboard_get_item(conn, id){
  var [rows, fields] = await conn.query("SELECT * FROM dashboards WHERE id = ?", [id]);
  if( rows.length != 1 )
    return null;
  var dashboard = rows[0];
  dashboard.updated_at = new Date(dashboard.updated_at).getTime();
  dashboard.created_at = new Date(dashboard.created_at).getTime();
  dashboard.widgets = JSON.parse(dashboard.widgets);
  return dashboard;
}

async function dashboard_delete(conn, id){
  var sql = "DELETE FROM dashboards WHERE id = ?";
  var data = [id];
  var result = await conn.execute(sql, data);
  return result;
}

async function dashboard_update(conn, id, title, description, widgets){
  var sql = "UPDATE dashboards SET title = ?, description = ?, widgets = ? WHERE id = ?";
  var data = [title, description, JSON.stringify(widgets), id];
  var result = await conn.execute(sql, data);
  return result;
}

async function dashboard_get_list(conn){
  var [rows, fields] = await conn.query("SELECT * FROM dashboards", []);

  for( let dashboard of rows ){
    dashboard.updated_at = new Date(dashboard.updated_at).getTime();
    dashboard.created_at = new Date(dashboard.created_at).getTime();
    dashboard.widgets = JSON.parse(dashboard.widgets);
  }
  return rows;
}
