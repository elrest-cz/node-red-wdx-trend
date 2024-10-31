/**
 * Elrest - Node RED - Runtime Node
 * 
 * @copyright 2024 Elrest Automations Systeme GMBH
 */

module.exports = function (RED) {

	"use strict";

	const ws = require("ws");
	const uuid = require("uuid");
	const { Subject, BehaviorSubject } = require("rxjs");

	const WDXSchema = require("@wago/wdx-schema");

	const WS_STATUS_ONLINE_COLOR = 'green'; //@todo Wago green not work as format: #6EC800 , rgb(110, 200, 0)
	const WS_STATUS_OFFLINE_COLOR = 'red';
	const WS_STATUS_ERROR_COLOR = 'red';
	const WS_STATUS_CONNECTING_COLOR = 'blue';

	const WS_STATUS_CODES = {
		CONNECTING: 'CONNECTING',
		OPEN: 'OPEN',
		CLOSING: 'CLOSING',
		CLOSED: 'CLOSED'
	};

	const NODE_STATUS = {
		OPEN: {
			fill: WS_STATUS_ONLINE_COLOR,
			shape: "dot",
			text: "Open"
		},
		ERROR: {
			fill: WS_STATUS_ERROR_COLOR,
			shape: "dot",
			text: "Error"
		},
		CLOSED: {
			fill: WS_STATUS_OFFLINE_COLOR,
			shape: "dot",
			text: "Closed"
		},
		CONNECTING: {
			fill: WS_STATUS_CONNECTING_COLOR,
			shape: "dot",
			text: "Connecting"
		},
		CLOSING: {
			fill: WS_STATUS_CONNECTING_COLOR,
			shape: "dot",
			text: "Closing"
		}
	};

	const WS_RECONNECT_TIMEOUT = 1000;

	function EDesignRuntimeWebSocketClient(config) {
		console.log("EDesignRuntimeWebSocketClient");
		RED.nodes.createNode(this, config);

		this.__ws = undefined;
		this.__wsStatus = new BehaviorSubject(WS_STATUS_CODES.CONNECTING);
		this.__wsIncomingMessages = new Subject();
		this.__closing = false;

		const __connect = async () => {

			this.__ws = new ws(config.url);
			this.__ws.setMaxListeners(0);
			this.__ws.uuid = uuid.v4();

			this.__ws.on('open', () => {
				//console.log("EDesignRuntimeWebSocketClient.opened");

				this.__wsStatus.next(WS_STATUS_CODES.OPEN);
				this.emit(
					'opened',
					{
						count: '',
						id: this.__ws.uuid
					}
				);
			});

			this.__ws.on('close', () => {

				//console.log("EDesignRuntimeWebSocketClient.ws.closed", this.__closing);
				this.__wsStatus.next(WS_STATUS_CODES.CLOSED);

				this.emit('closed', { count: '', id: this.__ws.uuid });

				if (!this.__closing) {
					// Node is closing - do not reconnect ws after its disconnection when node shutdown
					clearTimeout(this.tout);
					//console.log("EDesignRuntimeWebSocketClient.ws.reconnect");
					this.tout = setTimeout(
						() => {
							__connect();
						}, WS_RECONNECT_TIMEOUT
					);
				}
			});

			this.__ws.on('error', (err) => {

				console.error("EDesignRuntimeWebSocketClient.error", err);

				this.emit(
					'erro',
					{
						err: err,
						id: this.__ws.uuid
					}
				);

				if (!this.__closing) {
					clearTimeout(this.tout);

					this.tout = setTimeout(
						() => {
							__connect();
						}, WS_RECONNECT_TIMEOUT
					);
				}
			});

			this.__ws.on(
				'message',
				(data, flags) => {
					//console.debug("EDesignRuntimeWebSocketClient.ws.message", data.toString(), flags);
					this.__wsIncomingMessages.next(JSON.parse(data));
				}
			);
		}

		this.on("close", (done) => {
			//console.log("EDesignRuntimeWebSocketClient.close");

			this.__closing = true;
			this.__wsStatus.next(WS_STATUS_CODES.CLOSING);
			this.__ws.close();
			return done();
		});

		__connect();
	}

	EDesignRuntimeWebSocketClient.prototype.wsStatus = function () {
		return this.__wsStatus;
	}

	EDesignRuntimeWebSocketClient.prototype.wsMessages = function () {
		return this.__wsIncomingMessages;
	}

	EDesignRuntimeWebSocketClient.prototype.wsSend = function (data) {
		//console.log("EDesignRuntimeWebSocketClient.send", data);
		this.__ws.send(JSON.stringify(data));
	}

	RED.nodes.registerType("edesign.runtime.web-socket", EDesignRuntimeWebSocketClient);

	/**
	 * Trends
	 */

	//edesign.runtime.trend.list
	function EDesignRuntimeTrendList(config) {
		RED.nodes.createNode(this, config);

		this.status(NODE_STATUS.CONNECTING);

		const wsClient = RED.nodes.getNode(config.client);

		wsClient.on('opened', (event) => {
			this.status(Object.assign(NODE_STATUS.OPEN, {
				event: "connect",
				_session: { type: "websocket", id: event.id }
			}));
		});

		wsClient.on('erro', (event) => {
			this.status(Object.assign(NODE_STATUS.ERROR, {
				event: "error",
				_session: { type: "websocket", id: event.id }
			}));
		});

		wsClient.on('closed', (event) => {
			this.status(Object.assign(NODE_STATUS.CLOSED, {
				event: "disconnect",
				_session: { type: "websocket", id: event.id }
			}));
		});

		this.on('input', (msg, nodeSend, nodeDone) => {

			const request = new WDXSchema.WDX.Schema.Message.Trend.ListRequest();

			const subscription = wsClient.wsMessages().subscribe(
				{
					next: (wsMessage) => {
						if (wsMessage.type === WDXSchema.WDX.Schema.Message.Type.TrendingListResponse
							&& wsMessage.uuid === request.uuid) {

							if (undefined !== wsMessage.error) {
								msg.payload = wsMessage.error;
								this.send([null, msg]);
							} else {
								msg.payload = wsMessage.body;
								this.send([msg, null, null]);
							}
							subscription.unsubscribe();
						}
					},
					error: (wsError) => {
						console.error("EDesignRuntimeTrendList.input.wsMessages.error", wsError);
						subscription.unsubscribe();
						this.send([null, wsError]);
					}
				}
			);

			wsClient.wsSend(request);
		});

		this.on('close', () => {
			//console.log("EDesignRuntimeTrendList.close");

			this.status(NODE_STATUS.CLOSED);
		});
	}
	RED.nodes.registerType("edesign.runtime.trend.list", EDesignRuntimeTrendList,);

	//edesign.runtime.trend.detail
	function EDesignRuntimeTrendDetail(config) {
		RED.nodes.createNode(this, config);

		this.status(NODE_STATUS.CONNECTING);

		const wsClient = RED.nodes.getNode(config.client);

		wsClient.on('opened', (event) => {
			this.status(Object.assign(NODE_STATUS.OPEN, {
				event: "connect",
				_session: { type: "websocket", id: event.id }
			}));
		});

		wsClient.on('erro', (event) => {
			this.status(Object.assign(NODE_STATUS.ERROR, {
				event: "error",
				_session: { type: "websocket", id: event.id }
			}));
		});

		wsClient.on('closed', (event) => {
			this.status(Object.assign(NODE_STATUS.CLOSED, {
				event: "disconnect",
				_session: { type: "websocket", id: event.id }
			}));
		});

		this.on('input', (msg, nodeSend, nodeDone) => {

			const trendId = msg.trendId ?? config['trendId'] ?? undefined;
			if (undefined === trendId) {
				return;
			}
			const request = new WDXSchema.WDX.Schema.Message.Trend.DetailRequest(
				trendId,
			);

			const subscription = wsClient.wsMessages().subscribe(
				{
					next: (wsMessage) => {
						if (wsMessage.type === WDXSchema.WDX.Schema.Message.Type.TrendingDetailResponse
							&& wsMessage.uuid === request.uuid) {

							if (undefined !== wsMessage.error) {
								msg.payload = wsMessage.error;
								this.send([null, msg]);
							} else {
								msg.payload = wsMessage.body;
								this.send([msg, null, null]);
							}
							subscription.unsubscribe();
						}
					},
					error: (wsError) => {
						console.error("EDesignRuntimeTrendDetail.input.wsMessages.error", wsError);
						subscription.unsubscribe();
						this.send([null, wsError]);
					}
				}
			);

			wsClient.wsSend(request);
		});

		this.on('close', () => {
			//console.log("EDesignRuntimeTrendDetail.close");

			this.status(NODE_STATUS.CLOSED);
		});
	}
	RED.nodes.registerType("edesign.runtime.trend.detail", EDesignRuntimeTrendDetail,);

	//edesign.runtime.trend.delete
	function EDesignRuntimeTrendDelete(config) {
		RED.nodes.createNode(this, config);

		this.status(NODE_STATUS.CONNECTING);

		const wsClient = RED.nodes.getNode(config.client);

		wsClient.on('opened', (event) => {
			this.status(Object.assign(NODE_STATUS.OPEN, {
				event: "connect",
				_session: { type: "websocket", id: event.id }
			}));
		});

		wsClient.on('erro', (event) => {
			this.status(Object.assign(NODE_STATUS.ERROR, {
				event: "error",
				_session: { type: "websocket", id: event.id }
			}));
		});

		wsClient.on('closed', (event) => {
			this.status(Object.assign(NODE_STATUS.CLOSED, {
				event: "disconnect",
				_session: { type: "websocket", id: event.id }
			}));
		});

		this.on('input', (msg, nodeSend, nodeDone) => {

			const trendId = msg.trendId ?? config['trendId'] ?? undefined;
			if (undefined === trendId) {
				return;
			}
			const request = new WDXSchema.WDX.Schema.Message.Trend.DeleteRequest(
				trendId,
			);

			const subscription = wsClient.wsMessages().subscribe(
				{
					next: (wsMessage) => {
						if (wsMessage.type === WDXSchema.WDX.Schema.Message.Type.TrendingDeleteResponse
							&& wsMessage.uuid === request.uuid) {

							if (undefined !== wsMessage.error) {
								msg.payload = wsMessage.error;
								this.send([null, msg]);
							} else {
								msg.payload = wsMessage.body;
								this.send([msg, null, null]);
							}
							subscription.unsubscribe();
						}
					},
					error: (wsError) => {
						console.error("EDesignRuntimeTrendList.input.wsMessages.error", wsError);
						subscription.unsubscribe();
						this.send([null, wsError]);
					}
				}
			);

			wsClient.wsSend(request);
		});

		this.on('close', () => {
			//console.log("EDesignRuntimeTrendList.close");

			this.status(NODE_STATUS.CLOSED);
		});
	}
	RED.nodes.registerType("edesign.runtime.trend.delete", EDesignRuntimeTrendDelete,);

	//edesign.runtime.trend.save
	function EDesignRuntimeTrendSave(config) {
		RED.nodes.createNode(this, config);

		this.status(NODE_STATUS.CONNECTING);

		const wsClient = RED.nodes.getNode(config.client);

		wsClient.on('opened', (event) => {
			this.status(Object.assign(NODE_STATUS.OPEN, {
				event: "connect",
				_session: { type: "websocket", id: event.id }
			}));
		});

		wsClient.on('erro', (event) => {
			this.status(Object.assign(NODE_STATUS.ERROR, {
				event: "error",
				_session: { type: "websocket", id: event.id }
			}));
		});

		wsClient.on('closed', (event) => {
			this.status(Object.assign(NODE_STATUS.CLOSED, {
				event: "disconnect",
				_session: { type: "websocket", id: event.id }
			}));
		});

		this.on('input', (msg, nodeSend, nodeDone) => {

			const trend = msg.payload ?? config['trend'] ?? undefined;
			if (undefined === trend) {
				return;
			}

			const request = new WDXSchema.WDX.Schema.Message.Trend.SetRequest(
				trend,
			);

			const subscription = wsClient.wsMessages().subscribe(
				{
					next: (wsMessage) => {
						if (wsMessage.type === WDXSchema.WDX.Schema.Message.Type.TrendingSaveResponse
							&& wsMessage.uuid === request.uuid) {

							if (undefined !== wsMessage.error) {
								msg.payload = wsMessage.error;
								this.send([null, msg]);
							} else {
								msg.payload = wsMessage.body;
								this.send([msg, null,]);
							}
							subscription.unsubscribe();
						}
					},
					error: (wsError) => {
						console.error("EDesignRuntimeTrendSave.input.wsMessages.error", wsError);
						subscription.unsubscribe();
						this.send([null, wsError]);
					}
				}
			);

			wsClient.wsSend(request);
		});

		this.on('close', () => {
			//console.log("EDesignRuntimeTrendList.close");

			this.status(NODE_STATUS.CLOSED);
		});
	}
	RED.nodes.registerType("edesign.runtime.trend.save", EDesignRuntimeTrendSave,);


	//edesign.runtime.trend.export-csv
	function EDesignRuntimeTrendExportCSV(config) {
		RED.nodes.createNode(this, config);

		this.status(NODE_STATUS.CONNECTING);

		const wsClient = RED.nodes.getNode(config.client);

		wsClient.on('opened', (event) => {
			this.status(Object.assign(NODE_STATUS.OPEN, {
				event: "connect",
				_session: { type: "websocket", id: event.id }
			}));
		});

		wsClient.on('erro', (event) => {
			this.status(Object.assign(NODE_STATUS.ERROR, {
				event: "error",
				_session: { type: "websocket", id: event.id }
			}));
		});

		wsClient.on('closed', (event) => {
			this.status(Object.assign(NODE_STATUS.CLOSED, {
				event: "disconnect",
				_session: { type: "websocket", id: event.id }
			}));
		});

		this.on('input', (msg, nodeSend, nodeDone) => {

			const trend = msg.payload ?? config['trend'] ?? undefined;
			if (undefined === trend) {
				return;
			}

			const request = new WDXSchema.WDX.Schema.Message.Trend.TrendExportRequest(
				trend,
			);

			const subscription = wsClient.wsMessages().subscribe(
				{
					next: (wsMessage) => {
						if (wsMessage.type === WDXSchema.WDX.Schema.Message.Type.TrendingExportResponse
							&& wsMessage.uuid === request.uuid) {

							if (undefined !== wsMessage.error) {
								msg.payload = wsMessage.error;
								this.send([null, msg]);
							} else {
								msg.payload = wsMessage.body;
								this.send([msg, null,]);
							}
							subscription.unsubscribe();
						}
					},
					error: (wsError) => {
						console.error("EDesignRuntimeTrendExportCSV.input.wsMessages.error", wsError);
						subscription.unsubscribe();
						this.send([null, wsError]);
					}
				}
			);

			wsClient.wsSend(request);
		});

		this.on('close', () => {
			//console.log("EDesignRuntimeTrendList.close");

			this.status(NODE_STATUS.CLOSED);
		});
	}
	RED.nodes.registerType("edesign.runtime.trend.export-csv", EDesignRuntimeTrendExportCSV,);

	//edesign.runtime.trend.export-image
	function EDesignRuntimeTrendExportImage(config) {
		RED.nodes.createNode(this, config);

		this.status(NODE_STATUS.CONNECTING);

		const wsClient = RED.nodes.getNode(config.client);

		wsClient.on('opened', (event) => {
			this.status(Object.assign(NODE_STATUS.OPEN, {
				event: "connect",
				_session: { type: "websocket", id: event.id }
			}));
		});

		wsClient.on('erro', (event) => {
			this.status(Object.assign(NODE_STATUS.ERROR, {
				event: "error",
				_session: { type: "websocket", id: event.id }
			}));
		});

		wsClient.on('closed', (event) => {
			this.status(Object.assign(NODE_STATUS.CLOSED, {
				event: "disconnect",
				_session: { type: "websocket", id: event.id }
			}));
		});

		this.on('input', (msg, nodeSend, nodeDone) => {

			const trend = msg.payload ?? config['trend'] ?? undefined;
			if (undefined === trend) {
				return;
			}

			const request = new WDXSchema.WDX.Schema.Message.Trend.TrendExportRequest(
				trend,
			);

			const subscription = wsClient.wsMessages().subscribe(
				{
					next: (wsMessage) => {
						if (wsMessage.type === WDXSchema.WDX.Schema.Message.Type.TrendingExportResponse
							&& wsMessage.uuid === request.uuid) {

							if (undefined !== wsMessage.error) {
								msg.payload = wsMessage.error;
								this.send([null, msg]);
							} else {
								msg.payload = wsMessage.body;
								this.send([msg, null,]);
							}
							subscription.unsubscribe();
						}
					},
					error: (wsError) => {
						console.error("EDesignRuntimeTrendExportCSV.input.wsMessages.error", wsError);
						subscription.unsubscribe();
						this.send([null, wsError]);
					}
				}
			);

			wsClient.wsSend(request);
		});

		this.on('close', () => {
			//console.log("EDesignRuntimeTrendList.close");

			this.status(NODE_STATUS.CLOSED);
		});
	}
	RED.nodes.registerType("edesign.runtime.trend.export-image", EDesignRuntimeTrendExportImage,);

	//edesign.runtime.trend.export-sqlite
	function EDesignRuntimeTrendExportSQLite(config) {
		RED.nodes.createNode(this, config);

		this.status(NODE_STATUS.CONNECTING);

		const wsClient = RED.nodes.getNode(config.client);

		wsClient.on('opened', (event) => {
			this.status(Object.assign(NODE_STATUS.OPEN, {
				event: "connect",
				_session: { type: "websocket", id: event.id }
			}));
		});

		wsClient.on('erro', (event) => {
			this.status(Object.assign(NODE_STATUS.ERROR, {
				event: "error",
				_session: { type: "websocket", id: event.id }
			}));
		});

		wsClient.on('closed', (event) => {
			this.status(Object.assign(NODE_STATUS.CLOSED, {
				event: "disconnect",
				_session: { type: "websocket", id: event.id }
			}));
		});

		this.on('input', (msg, nodeSend, nodeDone) => {

			const trend = msg.payload ?? config['trend'] ?? undefined;

			if (undefined === trend) {
				return;
			}

			const request = new WDXSchema.WDX.Schema.Message.Trend.TrendExportRequest(
				trend,
			);

			const subscription = wsClient.wsMessages().subscribe(
				{
					next: (wsMessage) => {
						if (wsMessage.type === WDXSchema.WDX.Schema.Message.Type.TrendingExportResponse
							&& wsMessage.uuid === request.uuid) {

							if (undefined !== wsMessage.error) {
								msg.payload = wsMessage.error;
								this.send([null, msg]);
							} else {
								msg.payload = wsMessage.body;
								this.send([msg, null,]);
							}
							subscription.unsubscribe();
						}
					},
					error: (wsError) => {
						console.error("EDesignRuntimeTrendExportSQLite.input.wsMessages.error", wsError);
						subscription.unsubscribe();
						this.send([null, wsError]);
					}
				}
			);

			wsClient.wsSend(request);
		});

		this.on('close', () => {
			//console.log("EDesignRuntimeTrendList.close");

			this.status(NODE_STATUS.CLOSED);
		});
	}
	RED.nodes.registerType("edesign.runtime.trend.export-sqlite", EDesignRuntimeTrendExportSQLite,);


	//edesign.runtime.trend.monitor
	function EDesignRuntimeTrendExportMonitor(config) {
		RED.nodes.createNode(this, config);

		this.status(NODE_STATUS.CONNECTING);

		const wsClient = RED.nodes.getNode(config.client);

		wsClient.on('opened', (event) => {
			this.status(Object.assign(NODE_STATUS.OPEN, {
				event: "connect",
				_session: { type: "websocket", id: event.id }
			}));
		});

		wsClient.on('erro', (event) => {
			this.status(Object.assign(NODE_STATUS.ERROR, {
				event: "error",
				_session: { type: "websocket", id: event.id }
			}));
		});

		wsClient.on('closed', (event) => {
			this.status(Object.assign(NODE_STATUS.CLOSED, {
				event: "disconnect",
				_session: { type: "websocket", id: event.id }
			}));
		});

		this.on('input', (msg, nodeSend, nodeDone) => {

			const trendUuid = msg.payload ?? config['trendUuid'] ?? undefined;

			if (undefined === trendUuid) {
				return;
			}

			const request = new WDXSchema.WDX.Schema.Message.Trend.Trend.SubscribeRequest(
				trendUuid,
			);

			const subscription = wsClient.wsMessages().subscribe(
				{
					next: (wsMessage) => {
						if ((wsMessage.type === WDXSchema.WDX.Schema.Message.Type.TrendingSubscribeResponse
							&& wsMessage.uuid === request.uuid)
						|| wsMessage.type === WDXSchema.WDX.Schema.Message.Type.TrendingUpdate) {

							if (undefined !== wsMessage.error) {
								msg.payload = wsMessage.error;
								this.send([null, msg]);
							} else {
								msg.payload = wsMessage.body;
								this.send([msg, null,]);
							}
							subscription.unsubscribe();
						}
					},
					error: (wsError) => {
						console.error("EDesignRuntimeTrendExportMonitor.input.wsMessages.error", wsError);
						subscription.unsubscribe();
						this.send([null, wsError]);
					}
				}
			);

			wsClient.wsSend(request);
		});

		this.on('close', () => {
			//console.log("EDesignRuntimeTrendList.close");

			this.status(NODE_STATUS.CLOSED);
		});
	}
	RED.nodes.registerType("edesign.runtime.trend.monitor", EDesignRuntimeTrendExportMonitor,);
}