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
- msg.raw contains path and value to the specified node. Example:
```
{"path":"0.2.0","value":true}
```

### Output Pin
The output pin sends two objects:
- msg.payload contains the plain value from the Ember+ object
- msg.raw contains the whole Ember+ object from the underlying node-emberplus client 

## To Be Done

- [ ] Invoking functions
- [ ] Setting matrix connections
- [ ] Ember+ server
