/**
 * Elrest - Node RED - Runtime Node
 * 
 * @copyright 2024 Elrest Automations Systeme GMBH
 */

module.exports = function (RED) {

	"use strict";

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

	//wago.wdx.trend.list
	function EDesignRuntimeTrendList(config) {
		RED.nodes.createNode(this, config);

		const wsClient = RED.nodes.getNode(config.client);

		if (wsClient) {
			this.status(NODE_STATUS.CONNECTING);

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

		} else {
			this.status(NODE_STATUS.ERROR);
		}

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
	RED.nodes.registerType("wago.wdx.trend.list", EDesignRuntimeTrendList,);

	//wago.wdx.trend.detail
	function EDesignRuntimeTrendDetail(config) {
		RED.nodes.createNode(this, config);

		
		const wsClient = RED.nodes.getNode(config.client);

		if (wsClient) {
			this.status(NODE_STATUS.CONNECTING);

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

		} else {
			this.status(NODE_STATUS.ERROR);
		}

		this.on('input', (msg, nodeSend, nodeDone) => {

			const trendId = msg.trendUUID ?? config['trendUUID'] ?? undefined;
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
	RED.nodes.registerType("wago.wdx.trend.detail", EDesignRuntimeTrendDetail,);

	//wago.wdx.trend.delete
	function EDesignRuntimeTrendDelete(config) {
		RED.nodes.createNode(this, config);

		const wsClient = RED.nodes.getNode(config.client);

		if (wsClient) {
			this.status(NODE_STATUS.CONNECTING);

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

		} else {
			this.status(NODE_STATUS.ERROR);
		}

		this.on('input', (msg, nodeSend, nodeDone) => {

			const trendId = msg.trendUUID ?? config['trendUUID'] ?? undefined;
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
	RED.nodes.registerType("wago.wdx.trend.delete", EDesignRuntimeTrendDelete,);

	//wago.wdx.trend.save
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

			const trend = msg.trend ?? config['trend'] ?? undefined;
			if (undefined === trend) {
				return;
			}
			console.log(trend);
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
	RED.nodes.registerType("wago.wdx.trend.save", EDesignRuntimeTrendSave,);

	//wago.wdx.trend.export-csv
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

			const trend = msg.trendUUID ?? config['trendUUID'] ?? undefined;
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
	RED.nodes.registerType("wago.wdx.trend.export-csv", EDesignRuntimeTrendExportCSV,);

	//wago.wdx.trend.export-image
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

			const trend = msg.trendUUID ?? config['trendUUID'] ?? undefined;
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
	RED.nodes.registerType("wago.wdx.trend.export-image", EDesignRuntimeTrendExportImage,);

	//wago.wdx.trend.export-sqlite
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

			const trend = msg.trendUUID ?? config['trendUUID'] ?? undefined;

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
	RED.nodes.registerType("wago.wdx.trend.export-sqlite", EDesignRuntimeTrendExportSQLite,);


	//wago.wdx.trend.monitor
	function EDesignRuntimeTrendMonitor(config) {
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

			const trendUuid = msg.trendUUID ?? config['trendUUID'] ?? undefined;

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
	RED.nodes.registerType("wago.wdx.trend.monitor", EDesignRuntimeTrendMonitor,);
}