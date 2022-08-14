'use strict';

//const vConsole = new VConsole();
//window.datgui = new dat.GUI();

const base_url = "";

var vue_options = {
    el: "#top",
    mixins: [mixins_bootstrap],
    data: {
        dashboard: {},
        dashboard_id: null,
        widgets: [],
    },
    computed: {
    },
    methods: {
        range_type_update: async function(index){
            this.$set(this.dashboard.widgets, index, this.dashboard.widgets[index]);
        },
        widget_update: async function(index){
            var widget = this.dashboard.widgets[index];
            widget.channel_data = {};
            if(widget.type == 'Multiline'){
                if( !widget.chart ){
                    const ctx = document.getElementById('chart_' + index).getContext('2d');
                    widget.chart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            datasets: [],
                        },
                        options: {
                            scales: {
                                x: {
                                    type: 'time',
                                },
                            },
                        },
                    });
                }

                var now = new Date().getTime();
                var start_datetime = widget.start_datetime;
                var end_datetime = widget.end_datetime;
                if( widget.range_type == 'latest' ){
                    if(widget.last_type == '1hour') start_datetime = now - 60 * 60 * 1000;
                    else if(widget.last_type == '3hour') start_datetime = now - 3 * 60 * 60 * 1000;
                    else if(widget.last_type == '1day') start_datetime = now - 24 * 60 * 60 * 1000;
                    else if(widget.last_type == '1week') start_datetime = now - 7 * 24 * 60 * 60 * 1000;
                    else if( widget.last_type == '1month'){
                        var d = new Date(now);
                        d.setMonth(d.getMonth() - 1);
                        start_datetime = d.getTime();
                    }
                    end_datetime = now;
                }
                for( let line of widget.lines ){
                    if( !widget.channel_data[line.channel]){
                        var result_data = await do_post(base_url + '/channel-get-data', { name: line.channel, start: start_datetime, end: end_datetime });
                        widget.channel_data[line.channel] = result_data;
                    }
                }
                widget.chart.options.scales.x.min = start_datetime;
                widget.chart.options.scales.x.max = end_datetime;

                var datasets = [];
                for( let line of widget.lines){
                    var data = [];
                    for( let d of widget.channel_data[line.channel] ){
                        data.push({ x: d.created_at, y: d.json[line.resource] });
                    }
                    var dataset = {
                        label: line.label,
                        borderColor: line.color,
                        backgroundColor: line.color,
                        data: data,
                    };
                    if( line.stepped )
                        dataset.stepped = true;
                    datasets.push(dataset);
                }
                widget.chart.data.datasets = datasets;
                widget.chart.update();
            }else if(widget.type == 'GaugeMeter'){
                if( !widget.chart ){
                    const ctx = document.getElementById('chart_' + index).getContext('2d');
                    widget.chart = new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            datasets: [],
                        },
                        options: {
                            rotation: 270,
                            circumference: 180,
                            plugins: {
                                legend: false,
                            }
                        },
                    });
                }

                var result_data = await do_post(base_url + '/channel-get-latest', { name: widget.channel });
                widget.channel_data[widget.channel] = result_data[0].json;
                var datasets = [];
                var value = widget.channel_data[widget.channel][widget.resource];
                var dataset = {
                    data: [value, widget.maximum - value],
                    backgroundColor: [widget.color, "LightGray"]
                };
                datasets.push(dataset);
                widget.chart.data.datasets = datasets;
                widget.chart.update();
                this.$set(widget, "latest_value", value);
                console.log(widget);
            }else if(widget.type == 'TextArea'){
                for( let channel of widget.channels ){
                    var result_data = await do_post(base_url + '/channel-get-latest', { name: channel });
                    widget.channel_data[channel] = result_data[0].json;
                }
                widget.html = ejs.render(widget.text, widget.channel_data );
                this.$set(this.dashboard.widgets, index, this.dashboard.widgets[index]);
            }else if(widget.type == 'SignalSign'){
                var result_data = await do_post(base_url + '/channel-get-latest', { name: widget.channel });
                widget.channel_data[widget.channel] = result_data[0].json;
                var value = widget.channel_data[widget.channel][widget.resource];
                this.$set(widget, "latest_value", value);
                var color = widget.signals[widget.signals.length - 1].color;
                for( var i = 0 ; i < widget.signals.length ; i++ ){
                    if( value <= widget.signals[i].value ){
                        color = widget.signals[i].color;
                        break;
                    }
                }
                this.$set(widget, "latest_color", color);
            }
        }
    },
    created: function(){
    },
    mounted: async function(){
        proc_load();

        this.dashboard_id = searchs.dashboard;
        if( this.dashboard_id ){
            var result = await do_post(base_url + '/dashboard-get-item', { id: this.dashboard_id });
            console.log(result);
            this.dashboard = result;
            var now = new Date().getTime();
            for( let widget of result.widgets ){
                widget.channel_data = {};
                switch(widget.size){
                    case 16: widget.col_size = 'col-sm-2'; break;
                    case 25: widget.col_size = 'col-sm-3'; break;
                    case 33: widget.col_size = 'col-sm-4'; break;
                    case 50: widget.col_size = 'col-sm-6'; break;
                    case 100: widget.col_size = 'col-sm-12'; break;
                }
                if( widget.type == 'Multiline'){
                    widget.range_type = 'latest';
                    widget.last_type = '1day';
                    widget.start_datetime = now - 24 * 60 * 60 * 1000;
                    widget.end_datetime = now;
                }
            }
            this.widgets = result.widgets;

            this.$nextTick(() =>{
                for( var i = 0 ; i < this.widgets.length ; i++ ){
                    this.widget_update(i);
                }
            });
        }
    }
};
vue_add_data(vue_options, { progress_title: '' }); // for progress-dialog
vue_add_global_components(components_bootstrap);
vue_add_global_components(components_utils);

/* add additional components */
vue_add_global_components(components_datetime);

window.vue = new Vue( vue_options );
