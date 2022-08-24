const { EmberLib } = require('node-emberplus');
const { EmberClient } = require('node-emberplus/lib/client/ember-client');

/**
 * @typedef NodeRedFunctionArgs
 * @type {object}
 * @property {number} type - argument type
 * @property {number|string} value
 */

module.exports = function (RED) {
    /**
     * 
     * @param {NodeRedFunctionArgs} arg 
     * @returns {EmberLib.FunctionArgument}
     */
    function convertArg(arg) {
        return new EmberLib.FunctionArgument(arg.type, arg.value);
    }


    function EmberPlusNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.configRead = config.read;
        node.path = config.path.substring(0, config.path.indexOf(':'));
        /** @type {EmberClient} */
        node.client = null;

        /**
         * 
         * @param {string} _path 
         * @param {EmberClient} client 
         */
        async function handleClientReady(_path, client) {
            node.client = client;
            if (node.path) {
                if (node.configRead) {
                    try {
                        const element = await client.getElementByPathAsync(node.path);
                        updateOutput(element);
                    } catch(e) {
                        console.log(e);
                    }
                }
                try {
                    await client.getElementByPathAsync(node.path, update => updateOutput(update))
                } catch(e) {
                    node.warn(e.stack);
                    console.log(e);
                }
            }
        }

        /**
         * 
         * @param {Element} element
         * @param {function | null} send
         */
        function updateOutput(element, send) {
            const msg = { 'payload': null };
            if (config.outputMode == 'full') {
                msg.payload = { 'full': element };
            } else if (config.outputMode == 'contents') {
                msg.payload = { 'contents': element.contents };
            } else if (element.isInvocationResult() || config.outputMode == 'json') {
                msg.payload = element.toJSON();
            } else {
                msg.payload = element.value
            }
            if (send) {
                send(msg);
            } else {
                node.send(msg);
            }
        }

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
            server.on("clientready", (_paths, client) => {
                handleClientReady(_paths, client).catch(e => console.log(e));
            });
        } else {
            // No config node configured
        }
        node.on('input', async (msg, send, done) => {
            const payload = msg.payload;            
            try {
                if (!node.client.isConnected()) {
                    await node.client.connectAsync();
                }
                const element = await node.client.getElementByPathAsync(node.path);
                const p = (payload.full != undefined && payload.full.path != undefined) ? payload.full.path : node.path;
                if (element.isParameter()) {                    
                    const v = (payload.full != undefined && payload.full.value != undefined) ? payload.full.value : payload;
                    if (element.value != v) {
                        this.log(`Sending new value ${v} to parameter ${element.path}`);
                        await node.client.setValueAsync(element, v);
                    }
                } else if (element.isFunction()) {
                    /**
                     * @type {NodeRedFunctionArgs}[]
                     */
                    const args = payload.args != null ? payload.args : JSON.parse(payload);
                    this.log(`Invoking fonction ${element.path} with ${JSON.stringify(args)}`);
                    const invokeResult = await node.client.invokeFunctionAsync(element, args.map(convertArg));
                    this.log(`Received fonction ${element.path} result ${JSON.stringify(invokeResult.toJSON())}`);
                    updateOutput(invokeResult, send);
                }
            } catch(e) {
                if (done) {
                    done(e);
                } else {
                    node.error(e.stack);
                }
                this.log(e);
            }
        });
    }
    RED.nodes.registerType("ember+", EmberPlusNode);
}
