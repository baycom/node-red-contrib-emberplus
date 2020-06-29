const util = require('util');

module.exports = function (RED) {

    function EmberPlusNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var path = config.path.substring(0, config.path.indexOf(':'));
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
            function send(update) {
                var msg = { 'payload': null };
                if (config.outputMode == 'full') {
                    msg.payload = { 'full': update };
                } else if (config.outputMode == 'contents') {
                    msg.payload = { 'contents': update.contents };
                } else {
                    msg.payload = update.contents.value;
                }
                node.send(msg);
            }
            server.on("clientready", function (paths, client) {
                node.client = client;
                if (path) {
                    if (config.read) {
                        send(client.root.getElementByPath(path));
                    }
                    client.getElementByPath(path, update => send(update))
                        .catch((e) => {
                            node.warn(e.stack);
                            console.log(e.stack);
                        });
                }
            });
        } else {
            // No config node configured
        }
        node.on('input', function (msg) {
            var payload = msg.payload;
            var p = (payload.full != undefined && payload.full.path != undefined) ? payload.full.path : path;
            var v = (payload.full != undefined && payload.full.value != undefined) ? payload.full.value : payload;
            if (node.client.root.getElementByPath(path) != v) {
                    node.client.getElementByPath(p)
                        .then((p) => node.client.setValueNoAck(p, v))
                        .catch((e) => {
                            node.warn(e.stack);
                            console.log(e.stack);
                        });
            }
        });
    }
    RED.nodes.registerType("ember+", EmberPlusNode);
}
