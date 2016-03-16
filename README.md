Log in to Web apps using EPFL\'s Tequila

Like the [passport-tequila npm](https://www.npmjs.com/package/passport-tequila), but for Meteor

# API Reference

<a name="Tequila"></a>

## Tequila
**Kind**: global class  

* [Tequila](#Tequila)
    * [.get](#Tequila.get)
    * [.options](#Tequila.options)
    * [.start()](#Tequila.start)

<a name="Tequila.get"></a>

### Tequila.get
Reactively obtain the current Tequila state

**Kind**: static property of <code>[Tequila](#Tequila)</code>  
**Locus**: Client  
<a name="Tequila.options"></a>

### Tequila.options
Options applied by [#Tequila.start](#Tequila.start)

**Kind**: static property of <code>[Tequila](#Tequila)</code>  
<a name="Tequila.start"></a>

### Tequila.start()
Start Tequila authentication

Called automatically unless `Tequila.options.autoStart` is false.

**Kind**: static method of <code>[Tequila](#Tequila)</code>  
