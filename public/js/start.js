'use strict';

//const vConsole = new VConsole();
//window.datgui = new dat.GUI();

const base_url = "";
const NUM_OF_SIGNAL = 5;

var vue_options = {
    el: "#top",
    mixins: [mixins_bootstrap],
    data: {
        channel_list: [],
        channel_edit: {},
        channel_edit_mode: null,

        dashboard_list: [],
        dashboard_edit_mode: null,
        dashboard_edit: { widgets: [] },
        dashboard_widget: { type: null, resource_list: [] },
        dashboard_edit_widget_index: -1,
        dashboard_edit_line_index: -1,
        dashboard_line: null,
        resource_list: [],

        datum_data_list: [],
        datum_channel: null,
        datum_limit: 50,
    },
    computed: {
    },
    methods: {
        toDatetimeString: function(tim){
            return new Date(tim).toLocaleString();
        },

        dashboard_list_update: async function(){
            var result = await do_post(base_url + '/dashboard-get-list')
            console.log(result);
            this.dashboard_list = result.list;
        },
        dashboard_edit_open: function(index){
            this.dashboard_edit_mode = 'edit';
            this.dashboard_edit = JSON.parse(JSON.stringify(this.dashboard_list[index]));
            this.dashboard_widget.type = null;
            this.dialog_open('#dashboard_edit_dialog');
        },
        dashboard_create_open: function(){
            this.dashboard_edit_mode = 'create';
            this.dashboard_edit = { description: '', widgets: [] };
            this.dashboard_widget.type = null;
            this.dialog_open('#dashboard_edit_dialog');
        },
        dashboard_create_save: async function(){
            if( !this.dashboard_edit.title ){
                return alert('タイトルがありません。');
            }
            var result = await do_post(base_url + '/dashboard-create', this.dashboard_edit);
            this.dialog_close('#dashboard_edit_dialog');
            alert('作成しました。');
            await this.dashboard_list_update();
        },
        dashboard_edit_save: async function(){
            if( !this.dashboard_edit.title ){
                return alert('タイトルがありません。');
            }
            var result = await do_post(base_url + '/dashboard-update', this.dashboard_edit);
            this.dialog_close('#dashboard_edit_dialog');
            alert('更新しました。');
            await this.dashboard_list_update();
        },
        dashboard_edit_select_change_channel: function(){
            var channel = this.channel_list.find(item => item.name == this.dashboard_widget.channel);
            this.resource_list = channel.resources;
        },
        dashboard_edit_line_select_change_channel: function(){
            var channel = this.channel_list.find(item => item.name == this.dashboard_line.channel);
            this.resource_list = channel.resources;
        },
        dashboard_edit_add_widget: function(){
            this.dashboard_edit.widgets.push(JSON.parse(JSON.stringify(this.dashboard_widget)));
            this.dashboard_widget.type = null;
        },
        dashboard_edit_modify_widget: function(){
            this.dashboard_edit.widgets[this.dashboard_edit_widget_index] = JSON.parse(JSON.stringify(this.dashboard_widget));
            this.dashboard_widget.type = null;
        },
        dashboard_edit_new_widget: function(type){
            this.dashboard_widget_index = -1;
            var dashboard_widget = {
                type: type,
                size: 50,
            };
            switch( type ){
                case 'TextArea':{
                    dashboard_widget.channels = [];
                    break;
                }
                case 'Multiline':{
                    dashboard_widget.lines = [];
                    break;
                }
                case 'GaugeMeter':{
                    dashboard_widget.color = "#ff0000";
                    break;
                }
                case 'SignalSign':{
                    dashboard_widget.signals = [];
                    for( var i = 0 ; i < 5 ; i++ )
                        dashboard_widget.signals.push({
                            value: (i + 1) * (100 / NUM_OF_SIGNAL),
                            color: '#ff0000'
                        });
                    break;
                }
            }
            this.dashboard_widget = dashboard_widget;
        },
        dashboard_edit_edit_widget: function(index){
            this.dashboard_edit_widget_index = index;
            this.dashboard_widget = JSON.parse(JSON.stringify(this.dashboard_edit.widgets[index]));
            if( this.dashboard_widget.type == 'GaugeMeter' || this.dashboard_widget.type == 'SignalSign')
                this.dashboard_edit_select_change_channel();
        },
        dashboard_edit_delete_widget: async function(index){
            this.dashboard_edit.widgets.splice(index, 1);
            this.dashboard_widget.type = null;
            await this.dashboard_list_update();
        },
        dashboard_delete: async function(index){
            if( !confirm('本当に削除しますか？') )
                return;
            var result = await do_post(base_url + '/dashboard-delete', { id: this.dashboard_list[index].id });
            alert('削除しました。');
            await this.dashboard_list_update();
        },
        dashboard_edit_add_line_open: function(){
            this.dashboard_line = {
                color: "#ff0000"
            };
            this.dashboard_edit_line_index = -1;
        },
        dashboard_edit_add_line_save: function(){
            this.dashboard_line.stepped = (this.dashboard_line.stepped) ? true : false;
            if( this.dashboard_edit_line_index >= 0)
                this.dashboard_widget.lines[this.dashboard_edit_line_index] = JSON.parse(JSON.stringify(this.dashboard_line));
            else
            this.dashboard_widget.lines.push(JSON.parse(JSON.stringify(this.dashboard_line)));
            this.dashboard_line = null;
        },
        dashboard_edit_edit_line: function(index){
            this.dashboard_line = JSON.parse(JSON.stringify(this.dashboard_widget.lines[index]));
            this.dashboard_edit_line_index = index;
            if( this.dashboard_widget.type == 'Mutiline')
                this.dashboard_edit_line_select_change_channel();
        },
        dashboard_edit_delete_line: function(index){
            this.dashboard_widget.lines.splice(index, 1);
            this.dashboard_widget = JSON.parse(JSON.stringify(this.dashboard_widget));
            this.dashboard_line = null;
        },
        dashboard_edit_order_widget: function(index, asc){
            if( asc ){
                if( index >= (this.dashboard_edit.widgets.length - 1))
                    return;
                var temp = this.dashboard_edit.widgets[index + 1];
                this.dashboard_edit.widgets[index + 1] = this.dashboard_edit.widgets[index];
                this.dashboard_edit.widgets[index] = temp;
            }else{
                if( index <= 0 )
                    return;
                var temp = this.dashboard_edit.widgets[index - 1];
                this.dashboard_edit.widgets[index - 1] = this.dashboard_edit.widgets[index];
                this.dashboard_edit.widgets[index] = temp;
            }
            this.dashboard_widget = JSON.parse(JSON.stringify(this.dashboard_widget));
            this.dashboard_edit_line_index = -1;
        },

        datum_change_limit: async function(){
            var result = await do_post(base_url + '/channel-get-latest', { name: this.datum_channel.name, num: this.datum_limit });
            this.datum_data_list = result;
        },

        channel_datum_view: async function(index){
            this.datum_data_list = [];
            this.datum_channel = this.channel_list[index];
            this.datum_limit = 50;
            await this.datum_change_limit();
            this.dialog_open('#datum_view_dialog');
        },
        channel_list_update: async function(){
            var result = await do_post(base_url + '/channel-get-list')
            console.log(result);
            this.channel_list = result.list;
        },
        channel_create_open: function(){
            this.channel_edit_mode = "new";
            this.channel_edit = { descripton: "", resources: [] };
            this.dialog_open('#channel_edit_dialog');
        },
        channel_edit_open: function(index){
            this.channel_edit_mode = "edit";
            this.channel_edit = JSON.parse(JSON.stringify(this.channel_list[index]));
            this.dialog_open('#channel_edit_dialog');
        },
        channel_edit_remove_resource: function(index){
            this.channel_edit.resources.splice(index, 1);
        },
        channel_edit_new_resource: function(){
            this.channel_edit.resources.push({
                name: "",
                description: "",
                type: "any"
            });
        },
        channel_edit_save: async function(){
            for( let resource of this.channel_edit.resources ){
                if( !resource.name )
                    return confirm("リソース名がありません。");
            }
            var result = await do_post(base_url + '/channel-update', this.channel_edit);
            this.dialog_close('#channel_edit_dialog');
            alert('更新しました。');
            await this.channel_list_update();
        },
        channel_create_save: async function(){
            if( !this.channel_edit.name ){
                return alert('チャネル名がありません。');
            }
            for( let resource of this.channel_edit.resources ){
                if( !resource.name )
                    return confirm("リソース名がありません。");
            }
            var result = await do_post(base_url + '/channel-create', this.channel_edit);
            this.dialog_close('#channel_edit_dialog');
            alert('作成しました。');
            await this.channel_list_update();
        },
        channel_delete: async function(index){
            if( !confirm('本当に削除しますか？') )
                return;
            var result = await do_post(base_url + '/channel-delete', { name: this.channel_list[index].name });
            alert('削除しました。');
            await this.channel_list_update();
        },
    },
    created: function(){
    },
    mounted: async function(){
        proc_load();

        this.channel_list_update();
        this.dashboard_list_update();
    }
};
vue_add_data(vue_options, { progress_title: '' }); // for progress-dialog
vue_add_global_components(components_bootstrap);
vue_add_global_components(components_utils);

/* add additional components */
  
window.vue = new Vue( vue_options );
