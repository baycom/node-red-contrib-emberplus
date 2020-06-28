# node-red-contrib-emberplus
Simple Ember+ client node for broadcast automation (LAWO, DHD, etc.). Ember+ is open source and implemented in hard- and software products. More information can be found here: [Ember+ control protocol](https://github.com/Lawo/ember-plus/wiki)

##  emberplus-server node 
First of all there is at least one emberplus-server node to be configured. Simply set an IP address and a port (usually 9000). It is possible to add several emberplus-server nodes for different targets (for example all your audio mixers).

## emberplus node
Each emberplus node is associated with a previously configured emberplus-server node. Further an object path can be selected if the node should subscribe a specific object in the Ember+ tree. If you don't know the path, click on the looking glass symbol on the right.

### Input Pin
The input pin of the node takes two types of message payloads:
- msg.payload takes the plain value to be set to the specified path. Example: 
```
true
```
- msg.payload contains path and value to the specified node. Example:
```
{"full":{"path":"0.1.0","value":true}}
```

### Output Pin
The data format of the output pin can be configured:
- plain: msg.payload contains the plain value from the Ember+ object
- contents: msg.payload.contents contains the contents Ember+ object from the underlying node-emberplus client 
- full: msg.payload.full contains the full Ember+ object from the underlying node-emberplus (including the device path)
If needed the inital state may be sent by clicking a corresponding checkbox.

## To Be Done

- [ ] Invoking functions
- [ ] Setting matrix connections
- [ ] Ember+ server
