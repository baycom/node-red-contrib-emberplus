const { EmberClient, EmberLib } = require('node-emberplus');
const util = require('util');
const { emit } = require('process');

module.exports = function (RED) {

        function EmberPlusServerNode(n) {
                var statusCallbacks = [];

                RED.nodes.createNode(this, n);

                this.host = n.host;
                this.port = n.port;
                this.name = n.name;
                var node = this;
                node.shutdown = false;

                //Send a message to the subscribed nodes (appears on the flow)
                node.sendStatus = function (colour, message, extraInformation = "") {
                        for (var i = 0; i < statusCallbacks.length; i++) {
                                statusCallbacks[i](colour, message, extraInformation);
                        }
                }

                //Callback definitions
                node.addStatusCallback = function (func) { statusCallbacks.push(func); }

                //Send out a error
                function sendError(errorNode, errorMessage) {
                        if (lastSentError !== errorNode + ":" + errorMessage) {
                                lastSentError = errorNode + ":" + errorMessage;
                                node.sendStatus("red", errorNode, errorMessage);
                        }
                }
                function reconnect(host, port) {
                        if (node.client) {
                                delete node.client;
                        }
                        var client = new EmberClient(node.host, node.port);
                        node.client = client;
                        client.on("error", function (e) {
                                node.sendStatus("red", "Error", e)
                        })
                        client.on("connecting", function () {
                                node.sendStatus("yellow", "Connecting");
                        });
                        client.on("connected", function () {
                                node.sendStatus("green", "Connected");
                                var paths = [];
                                client.getDirectory()
                                        .then(() => client.expand(client.root.getElementByNumber(0)))
                                        .then(() => client.root.elements.forEach(function (v1, k1) {
                                                if (typeof v1.elements === "object") {
                                                        v1.elements.forEach(function (v2, k2) {
                                                                if (typeof v2.elements === "object") {
                                                                        v2.elements.forEach(function (v3, k3) {
                                                                                if (typeof v3.elements === "object") {
                                                                                        v3.elements.forEach(function (v4, k4) {
                                                                                                if (typeof v4.elements === "object") {
                                                                                                        v4.elements.forEach(function (v5, k5) {
                                                                                                                paths.push({ "path": v5.path, "id": v5.path + ":/" + v5.contents.identifier + "->" + (v5.contents.description ? v5.contents.description : v5.contents.value) });
                                                                                                        });
                                                                                                } else {
                                                                                                        paths.push({ "path": v4.path, "id": v4.path + ":/" + v1.contents.identifier + "/" + v2.contents.identifier + "/" + v3.contents.identifier + "/" + v4.contents.identifier + " (" + (v3.contents.description ? v3.contents.description : v3.contents.value) + ")" });
                                                                                                }
                                                                                        });
                                                                                } else {
                                                                                        paths.push({ "path": v3.path, "id": v3.path + ":/" + v1.contents.identifier + "/" + v2.contents.identifier + "/" + v3.contents.identifier + " (" + (v3.contents.description ? v3.contents.description : v3.contents.value) + ")" });
                                                                                }
                                                                        });
                                                                } else {
                                                                        paths.push({ "path": v2.path, "id": v2.path + ":/" + v1.contents.identifier + "/" + v2.contents.identifier + " (" + (v2.contents.description ? v2.contents.description : v2.contents.value) + ")" });
                                                                }
                                                        });
                                                }
                                        })
                                        )
                                        .then(() => {
                                                global.paths = paths; node.paths = paths;
                                                node.sendStatus("green", "Connected");
                                                node.emit("clientready", node.paths, client);
                                        })
                                        .catch((e) => {
                                                console.log(e.stack);
                                        })
                        });
                        client.on("disconnected", function () {
                                node.sendStatus("red", "Disconnected");
                                if (!node.shutdown) {
                                        reconnect();
                                }
                        });
                        client.connect()
                                .catch((e) => {
                                        console.log(e.stack);
                                });
                }
                //On redeploy
                node.on("close", function () {
                        node.shutdown = true;
                        node.client.disconnect();
                });

                reconnect(node.host, node.port);
        }
        RED.httpAdmin.get('/emberplus/:node/paths', RED.auth.needsPermission('emberplus.read'), (req, res) => {
                var node = RED.nodes.getNode(req.params.node);
                if (node != null) {
                        if (node.paths.length) {
                                res.status(200).send(JSON.stringify(node.paths));
                        } else {
                                res.status(401).send(`401 Not found: no path data yet`);
                        }
                } else {
                        res.status(401).send(`401 Invalid node id`);
                }
        });
        RED.nodes.registerType("emberplus-server", EmberPlusServerNode);
}
