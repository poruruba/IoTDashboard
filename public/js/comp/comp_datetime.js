const components_datetime = {
  comp_datetime: {
    props: ['value'],
    template: `
    <span>
        <input class="form-control" type="datetime-local" v-bind:value="datetime" v-on:input="do_input">
    </span>
    `,
    computed: {
      datetime: function(){
        if( !this.value )
          return toDatetimeString(new Date().getTime());
        else
          return toDatetimeString(this.value);
      }
    },
    methods: {
      do_input: function(event){
        return this.$emit("input", new Date(event.target.value).getTime());
      }
    }
  },
}

function to2d(d){
  return ("00" + d).slice(-2);
}

function toDatetimeString(tim){
  var d = new Date(tim);
  return d.getFullYear() + '-' + this.to2d(d.getMonth() + 1) + '-' + this.to2d(d.getDate()) + 'T' + this.to2d(d.getHours()) + ':' + this.to2d(d.getMinutes()); 
}
