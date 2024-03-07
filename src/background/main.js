/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  Logger
} from './logger.js';
import {
  Component
} from './component.js';
import {
  UI
} from './ui.js';
import StorageUtils from "./storageUtils.js";

const log = Logger.logger('Main');

class Main {
  #state = STATE_LOADING;
  #observers = new Set();

  // We want to avoid the processing of events during the initialization.
  // Setting handlingEvent to true, we simulate the processing of an event
  // and, because of this, any new incoming event will be stored in a queue
  // and processed only at the end of the initialization, when
  // this.syncProcessPendingEvents() is called.
  #handlingEvent = true;
  #pendingEvents = [];

  constructor() {
    log('CTOR');

    new Logger(this);
    new UI(this);
  }

  // Initialization of the main finite-state-machine.
  async init() {
    log('init');

    this.#state = await StorageUtils.getState() || STATE_LOADING;

    // Let's initialize the observers.
    for (const observer of this.#observers) {
      await observer.init();
    }

    // Inititialization completed. Let's process any pending event received in
    // the meantime.
    this.#handlingEvent = false;
    this.#syncProcessPendingEvents();
  }

  // The main state getter
  get state() {
    return this.#state;
  }

  // We could use a setter, but `setX` seems better.
  setState(state) {
    this.#state = state;
    for (const observer of this.#observers) {
      observer.stateChanged();
    }
  }

  registerObserver(observer) {
    console.assert(observer instanceof Component);
    this.#observers.add(observer);
  }

  // Provides an async response in most cases
  async handleEvent(type, data) {
    log(`handling event ${type}`);

    // In order to avoid race conditions generated by multiple events running
    // at the same time, we process them 1 by 1. If we are already handling an
    // event, we wait until it is concluded.
    if (this.#handlingEvent) {
      log(`Queuing event ${type}`);
      await new Promise(resolve => this.pendingEvents.push(resolve));
      log(`Event ${type} resumed`);
    }

    this.#handlingEvent = true;

    let returnValue;
    try {
      returnValue = await this.#handleEventInternal(type, data);
    } catch (e) {}

    this.#handlingEvent = false;
    this.#syncProcessPendingEvents();

    return returnValue;
  }

  #syncProcessPendingEvents() {
    if (this.#pendingEvents.length) {
      log(`Processing the first of ${this.#pendingEvents.length} events`);
      this.#pendingEvents.shift()();
    }
  }

  async #handleEventInternal(type, data) {
    switch (type) {
      // TODO: the magic goes here!

      default:
        console.error("Invalid event: " + type);
        throw new Error("Invalid event: " + type);
    }
  }
};

const i = new Main();
i.init();