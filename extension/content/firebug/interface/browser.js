/**
 * Software License Agreement (BSD License)
 * 
 * Copyright (c) 2010 IBM Corporation.
 * All rights reserved.
 * 
 * Redistribution and use of this software in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 * 
 * * Redistributions of source code must retain the above
 *   copyright notice, this list of conditions and the
 *   following disclaimer.
 * 
 * * Redistributions in binary form must reproduce the above
 *   copyright notice, this list of conditions and the
 *   following disclaimer in the documentation and/or other
 *   materials provided with the distribution.
 * 
 * * Neither the name of IBM nor the names of its
 *   contributors may be used to endorse or promote products
 *   derived from this software without specific prior
 *   written permission of IBM.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
 * OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Proxy to a debuggable web browser. A browser may be remote and contain one or more
 * JavaScript execution contexts. Each JavaScript execution context may contain one or
 * more compilation units. A browser provides notification to registered listeners describing
 * events that occur in the browser.
 * 
 * @constructor
 * @type Browser
 * @return a new Browser
 * @version 1.0
 */
function Browser() {
	this.contexts = {}; // map of contexts, indexed by conext ID
	this.activeContext = null;
	this.handlers = {}; // map of event types to array of handler functions
	this.EVENT_TYPES = ["onBreak", "onConsoleDebug", "onConsoleError", "onConsoleInfo", "onConsoleLog",
	                    "onConsoleWarn", "onContextCreated", "onContextDestroyed", "onContextChanged", "onInspectNode",
	                    "onResume", "onSuspend", "onToggleBreakpoint", "onDisconnect"];
	this.connected = false;
}

// ---- API ----

/**
 * Returns the {@link BrowserContext} with the specified id or <code>null</code>
 * if none.
 * 
 * @function
 * @param id identifier of an {@link BrowserContext}
 * @returns the {@link BrowserContext} with the specified id or <code>null</code>
 * 
 */
Browser.prototype.getBrowserContext = function(id) {
	var context = this.contexts[id];
	if (context) {
		return context;
	}
	return null;
};

/**
 * Returns the root contexts being browsed. A {@link BrowserContext} represents the
 * content that has been served up and is being rendered for a location (URL) that
 * has been navigated to. 
 * <p>
 * This function does not require communication with the remote browser.
 * </p>
 * @function
 * @returns an array of {@link BrowserContext}'s
 */
Browser.prototype.getBrowserContexts = function() {
	var knownContexts = [];
	for (var id in this.contexts) {
		knownContexts.push(this.contexts[id]);
	}
	return knownContexts;
}

/**
 * Returns the {@link BrowserContext} that currently has focus in the browser
 * or <code>null</code> if none.
 * 
 * @function
 * @returns the {@link BrowserContext} that has focus or <code>null</code>
 */
Browser.prototype.getFocusBrowserContext = function() {
	return this.activeContext;
};

/**
 * Returns whether this proxy is currently connected to the underlying browser it
 * represents.
 * 
 *  @function
 *  @returns whether connected to the underlying browser
 */
Browser.prototype.isConnected = function() {
	return this.connected;
};

/**
 * Registers a listener (function) for a specific type of event. Listener
 * call back functions are specified in {@link BrowserEventListener}.
 * <p>
 * The supported event types are:
 * <ul>
 *   <li>onBreak</li>
 *   <li>onConsoleDebug</li>
 *   <li>onConsoleError</li>
 *   <li>onConsoleInfo</li>
 *   <li>onConsoleLog</li>
 *   <li>onConsoleWarn</li>
 *   <li>onContextCreated</li>
 *   <li>onContextChanged</li>
 *   <li>onContextDestroyed</li>
 *   <li>onDisconnect</li>
 *   <li>onInspectNode</li>
 *   <li>onResume</li>
 *   <li>onScript</li>
 *   <li>onToggleBreakpoint</li>
 * </ul>
 * <ul>
 * <li>TODO: how can clients remove (deregister) listeners?</li>
 * </ul>
 * </p>
 * @function
 * @param eventType an event type ({@link String}) listed above
 * @param listener a listener (function) that handles the event as specified
 *   by {@link BrowserEventListener}
 * @exception Error if an unsupported event type is specified
 */
Browser.prototype.addEventListener = function(eventType, listener) {
	var i = this.EVENT_TYPES.indexof(eventType);
	if (i < 0) {
		// unsupported event type
		throw new Error("eventType '" + eventType + "' is not supported");
	}
	var list = this.handlers[eventType];
	if (!list) {
		list = [];
		this.handlers[eventType] = list;
	}
	list.push(listener);
};

/**
 * Disconnects this client from the browser it is associated with.
 * 
 * @function
 */
Browser.prototype.disconnect = function() {
	
}

//TODO: support to remove a listener

// ---- PRIVATE ---- Subclasses may call these functions

/**
 * Notification the given context has been added to this browser.
 * Adds the context to the list of active contexts and notifies context
 * listeners.
 * <p>
 * Has no effect if the context has already been created. For example,
 * it's possible for a race condition to occur when a remote browser
 * sends notification of a context being created before the initial set
 * of contexts have been retrieved. In such a case, it would possible for
 * a client to add the context twice (once for the create event, and again
 * when retrieving the initial list of contexts).
 * </p>
 * @function
 * @param context the {@link BrowserContext} that has been added
 */
Browser.prototype._contextCreated = function(context) {
	// if already present, don't add it again
	var id = context.getId();
	if (this.contexts[id]) {
		return;
	}
	this.contexts[id] = context;
	this._dispatch("onContextCreated", [context]);	
};

/**
 * Notification the given context has been destroyed.
 * Removes the context from the list of active contexts and notifies context
 * listeners.
 * <p>
 * Has no effect if the context has already been destroyed or has not yet
 * been retrieved from the browser. For example, it's possible for a race
 * condition to occur when a remote browser sends notification of a context
 * being destroyed before the initial list of contexts is retrieved from the
 * browser. In this case an implementation could ask to destroy a context that
 * that has not yet been reported as created.
 * </p>
 * 
 * @function
 * @param id the identifier of the {@link BrowserContext} that has been destroyed
 */
Browser.prototype._contextDestroyed = function(id) {
	var destroyed = this.contexts[id];
	if (destroyed) {
		destroyed._destroyed();
		delete this.contexts[id];
		this._dispatch("onContextDestroyed", [destroyed]);
	}
};

/**
 * Notification the given context has been loaded. Notifies context listeners.
 * 
 * @function
 * @param id the identifier of the {@link BrowserContext} that has been loaded
 */
Browser.prototype._contextLoaded = function(id) {
	var loaded = this.contexts[id];
	if (loaded) {
		loaded._loaded();
		this._dispatch("onContextLoaded", [loaded]);
	}
};

/**
 * Dispatches an event notification to all registered functions for
 * the specified event type.
 * 
 * @param eventType event type
 * @param arguments arguments to be applied to handler functions
 */
Browser.prototype._dispatch = function(eventType, arguments) {
	functions = this.handlers[eventType];
	if (functions) {
		for ( var i = 0; i < functions.length; i++) {
			functions[i].apply(null, arguments);
		}
	}
};

/**
 * Sets the browser context that has focus, possibly <code>null</code>.
 * 
 * @function
 * @param context a {@link BrowserContext} or <code>null</code>
 */
Browser.prototype._setFocusContext = function(context) {
	var prev = this.activeContext;
	this.activeContext = context;
	if (prev != context) {
		this._dispatch("onContextChanged", [prev, this.activeContext]);
	}
};

/**
 * Sets whether this proxy is connected to its underlying browser.
 * Sends 'onDisconnect' notification when the browser becomes disconnected.
 * 
 * @function
 * @param connected whether this proxy is connected to its underlying browser
 */
Browser.prototype._setConnected = function(connected) {
	var wasConnected = this.connected;
	this.connected = connected;
	if (wasConnected && !connected) {
		this._dispatch("onDisconnect", [this]);
	}

}
