const util = require('util');

module.exports = function (RED) {

    function EmberPlusNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var path=config.path.substring(0, config.path.indexOf(':'));
        node.client = null;

        // Retrieve the config node
        this.server = RED.nodes.getNode(config.server);
        if (this.server) {
            var server = this.server;
            server.addStatusCallback(function (color, message, extraInformation) {
                node.status({ fill: color, shape: "dot", text: message });
                if (extraInformation != "") {
                    node.error(extraInformation);
                }
            });
            server.on("clientready", function (paths, client) {
                node.client = client;
                if (path) {
                    client.getElementByPath(path, update => {
                        var msg = { "payload": update.contents.value, "raw": update.contents };
                        node.send(msg);
                    });
                }
            });
        } else {
            // No config node configured
        }

        node.on('input', function (msg) {
            node.client.getElementByPath(msg.raw.path ? msg.raw.path : path)
                .then((path) => { 
                    if(node.client) {
                        node.client.setValue(path, msg.payload?msg.payload:msg.raw.value);
                    }
                }).catch((e) => { console.log(e.stack); });
        });
    }
    RED.nodes.registerType("ember+", EmberPlusNode);
}
