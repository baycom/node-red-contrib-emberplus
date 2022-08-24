const { EmberClient, EmberLib } = require('node-emberplus');

const reconnectDelay = 30 * 1000;

module.exports = function (RED) {

        function EmberPlusServerNode(config) {
                var statusCallbacks = [];

                RED.nodes.createNode(this, config);

                this.host = config.host;
                this.port = config.port;
                this.name = config.name;
                this.configPaths = config.paths ? config.paths.split(",") : [];
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

                function getFunctionDescriptor(func) {
                        return (func.description ? func.description : 'function') + 
                        'args:' + func.arguments ? func.arguments.map(arg => {
                                const jarg = arg.toJSON();
                                return `${jarg.name}/${jarg.type}`;
                        }).join(",") : "";
                }

                /**
                 * 
                 * @param {EmberLib.Element} element 
                 */
                async function getEmberChildren(element) {
                        if (element.isParameter()) {
                                node.paths.push({ "path": element.path, "id": element.path + ":/" + element.identifier + "->" + (element.description ? element.description : element.value) });
                        } else if (element.isFunction()) {
                                node.paths.push({ "path": element.path, "id": element.path + ":/" + element.identifier + "->" + getFunctionDescriptor(element) });
                        }
                        const children = element.getChildren();
                        if (children && children.length) {
                                children.forEach(child => getEmberChildren(child));
                        }
                }

                async function getPath(path) {
                        try {
                                const element = await node.client.getElementByPathAsync(path);
                                await node.client.expandAsync(element);
                                await getEmberChildren(element);
                        } catch(e) {
                                console.log(e);
                        }
                }

                async function getCompleteTree() {
                        try {
                                const element = await node.client.expandAsync();
                                await getEmberChildren(node.client.root);
                        } catch(e) {
                                console.log(e);
                        }
                }

                async function reconnect() {
                        if (node.client) {
                                delete node.client;
                        }
                        var client = new EmberClient(node.host, node.port);
                        node.client = client;
                        node.paths = [];
                        client.on("error", e => {
                                node.sendStatus("red", "Error", e)
                        });
                        client.on("connecting", () => {
                                node.sendStatus("yellow", "Connecting");
                        });
                        client.on("disconnected", () => {
                                node.sendStatus("red", "Disconnected");
                                if (!node.shutdown) {
                                        setTimeout(() => reconnect().catch(e => console.log(e)), reconnectDelay);
                                }
                        });
                        client.on("connected", () => {
                                node.sendStatus("green", "Connected");                                
                        });
                        try {
                                await client.connectAsync();
                                
                                if (node.configPaths.length) {
                                        for(const path of node.configPaths) {
                                                await getPath(path);
                                        }
                                } else {
                                        await getCompleteTree();
                                }                                
                                node.emit("clientready", node.paths, client);
                        } catch(e) {
                                console.log(e);
                                setTimeout(() => reconnect().catch(e => console.log(e)), reconnectDelay);
                        }
                }
                //On redeploy
                node.on("close", function () {
                        node.shutdown = true;
                        node.client.disconnect();
                });

                reconnect().catch(e => console.log(e));
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
