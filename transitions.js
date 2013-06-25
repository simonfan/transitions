define(['jquery','buildable','taskrunner','backbone','underscore','_.mixins'], 
function(   $   , Buildable , Taskrunner , Backbone , undef      , undef    ) {

	////////////////////////
	//////// COMMON ////////
	////////////////////////


	////////////////////////////
	// TRANSITIONABLE ELEMENT //
	////////////////////////////

	var Element = Object.create(Buildable);

	Element.extend(Backbone.Events, {
		init: function(data) {
			_.interface(data, {
				id: 'Element init',
				typeofs: {
				//	id: ['string','number','undefined'],
					controller: 'object',
					$el: 'object',
				}
			});

			// bind methods!
			_.bindAll(this);

			// reference to transitions controller
			this.controller = data.controller;

			// states
			this.__states = data.controller.__states;
			this.__stateOptions = data.controller.__stateOptions;

			this.id = data.$el.prop('id');
			this.$el = data.$el;

			// this.$el is just the a reference to this.$el
			this.$el = this.$el;

			//////////////
			/// status ///
			//////////////
			this.inistate = this.$el.attr('data-inistate');
			this.state = '';
			this.transition = 'stopped';

			// build
			this._build();
		},

		_build: function() {
			this._setupEvents();
		},

		_setupEvents: function() {
			this.on('state-ini', this._handleIni);
			this.on('state-end', this._handleEnd);
		},

		_handleIni: function(statename) {
			this.transition = 'active';

			this.state = 'on-transition:' + statename;

			this.trigger(statename + '-ini');
		},

		_handleEnd: function(statename) {
			this.transition = 'stopped';
			this.state = statename;

			this.trigger(statename + '-end')
				.trigger(statename);
		},

		/// close to api ///
		// helper that processes the state object, in case
		// there is any processing needed (if a function is a property of the state object)
		_getstate: function(statename) {
			var _this = this,
				state = _.clone( this.__states[statename] );

			_.each(state, function(item, name) {
				if (typeof item === 'function') {
					// call the function in the $el's context.
					state[ name ] = item.call(_this.$el, _this.$el);
				}
			});

			return state;
		},

		/////////////////
		////// API //////
		/////////////////

		// transitate is a general method that allows transitions
		// using any of the defined transition methods defined, including
		// the 'hide' and 'show'
		transitate: function(statename, options) {
			if (!statename) { return true; }

			if (this._isDone(statename)) {
				return true;
			} else {
				var _this = this,
					state = this._getstate(statename),
					options = _.extend({}, this.__stateOptions[ statename ], options),
					animate = this.$el.stop().animate(state, options);

				this.trigger('state-ini', statename);

				$.when(animate).then(function() {
					_this.trigger('state-end', statename);
				});

				return animate;
			}
		},

		// check if transition is done or if it is already on its way
		_isDone: function(statename) {
			if (this.state === statename || this.state === statename.split('on-transition:')[1]) {
				return true;
			}
		}
	});

	////////////////////////////
	// TRANSITIONABLE ELEMENT //
	////////////////////////////



	////////////////
	// CONTROLLER //
	////////////////

	var Controller = Object.create(Buildable);

	Controller.extend(Backbone.Events, {
		init: function(data) {
			_.interface(data, {
				id: 'Transition Controller init',
				typeofs: {
					id: ['string','undefined'],
					$el: 'object',

					states: ['object', 'undefined'],
					stateOptions: ['object', 'undefined'],
					scenes: ['object', 'undefined'],
					sceneOptions: ['object', 'undefined'],
				}
			});

			this.$el = data.$el;
			this.elements = {};

			// status
			this.status = 'stopped';
			this.scene = '';

			// states
			this.__states = data.states || {};
			this.__stateOptions = data.stateOptions || {};

			// scenes
			this.__scenes = data.scenes || {};
			this.__sceneOptions = data.sceneOptions || {};

			// build
			this._build();

			// start the elements to their correct state;
		//	this._start();
		},

		_build: function() {
			this._findItems();
			this._setupEvents();
		},

		_findItems: function() {
			var _this = this,
				transitionEls = this.$el.children('.transition-el');

			transitionEls = transitionEls.length > 0 ? transitionEls : this.$el.children();

			_.each(transitionEls, function(li, index) {
				var $li = $(li),
					id = $li.prop('id');

				if (!id) {
					id = 'page-' + index;
					$li.prop('id', id);
				}

				_this.elements[ id ] = Element.build({ controller: _this, $el: $li });
			});
		},

		// event handlers
		_setupEvents: function() {
			this.on('scene-ini', this._handleIni);
			this.on('scene-end', this._handleEnd);
		},

		_handleIni: function(scenename) {
			this.status = 'active';
			this.scene = 'on-transition:' + scenename;

			this.trigger(scenename + '-ini');
		},

		_handleEnd: function(scenename) {
			this.status = 'stopped';
			this.scene = scenename;

			this.trigger(scenename + '-end')
				.trigger(scenename);

		},

		// conditional chain:
		// 1: retrieves a scene object with the given name
		// 2: retrieves a state with the given name and returns a scene object that 
		//	  sets all elements to that state
		// 3: false
		_getscene: function(name) {
			if (this.__scenes[name]) {
				return this.__scenes[name];

			} else if (this.__states[name]) {
				var scene = {},
					_this = this;

				_.each(this.elements, function(element, id) {
					scene[id] = name;
				})

				return scene;
			} else {
				throw new Error('Scene not found: ' + name);
			}
		},

		/////////////////
		////// API //////
		/////////////////
		definestate: function(name, state, options) {
			var i = _.interface(arguments, [
				{
					id: 'single-state',
					typeofs: ['string','object',['object','undefined']]
				},
				{
					id: 'multiple-state',
					typeofs: ['object',['object','undefined']]
				}
			]);

			if (i === 'single-state') {
				this.__states[ name ] = state;
				this.__stateOptions[name] = options;

			} else if (i === 'multiple-state') {
				this.__states = _.extend(this.__states, name);
				this.__stateOptions = _.extend(this.__stateOptions, state);

			}

			return this;
		},

		definescene: function(name, scene, options) {
			var i = _.interface(arguments, [
				{
					id: 'single-scene',
					typeofs: ['string','object',['object','undefined']]
				},
				{
					id: 'multiple-scene',
					typeofs: ['object',['object','undefined']]
				}
			]);

			if (i === 'single-scene') {
				this.__scenes[ name ] = scene;
				this.__sceneOptions[ name ] = options;
			} else if (i === 'multiple-scene') {
				this.__scenes = _.extend(this.__scenes, name);
				this.__sceneOptions = _.extend(this.__sceneOptions, scene);
			}
		},

		// receives an array of scenes to be performed synchronously
		transitate: function(scenes, options) {

			// verify the objective of the transition to see if 
			// the transition is not already there
			if (this._isDone(scenes)) {
				return true;
			}

			if (_.isArray(scenes)) {
				// scenes = sequence of scenes
				var _this = this,
					optionsIsArray = _.isArray(options),
					// build a taskrunner
					taskrunner = Taskrunner.build();

				_.each(scenes, function(scene, index) {
					// if options is an array, the options have been set for each of the
					// transitions. Else, options are common
					var sceneOptions = optionsIsArray ? options[index] : options;

					// extend the default options for the scene
					sceneOptions = _.extend({}, this.__sceneOptions, sceneOptions);

					// add a task per scene
					taskrunner.add(index, function(defer) {
						_this._transitate(defer, scene, sceneOptions);
					});
				});

				// trigger transition-ini and transition-end events
				this.trigger('transition-ini');

				return taskrunner.run().then(function() {
					_this.trigger('transition-end');
				});

			} else {
				// scenes = a single scene
				var _this = this,
					defer = $.Deferred();

				this._transitate(defer, scenes, options);

				// trigger transition-ini and transition-end events
				this.trigger('transition-ini');

				return defer.then(function() {
					_this.trigger('transition-end');
				});
			}
		},

		_isDone: function(scenes) {
			var objective = _.isArray(scenes) ? _.last(scenes) : scenes;

			objective = typeof objective === 'object' ? $.param(objective) : objective;

			// if the transition status is stopped, compare the scene directly to the objective
			// if the transition is active, compare the scene portion after 'on-transition:' with the objective
			return this.status === 'stopped' ? (this.scene === objective) : (this.scene.split('on-transition:')[1] === objective);
		},

		// _transitate is a helper function that runs one scene only
		// it adapts itself to the format established by Taskrunner tasks
		_transitate: function(defer, scenename, options) {

			if (typeof scenename === 'object') {
				// if scenename is actually a scene object,
				// first define it
				var scene = _.clone(scenename),
					scenename = $.param(scene);

				this.definescene(scenename, scene);

			} else if (typeof scenename === 'string') {
				// check if scenename has ':'. This will be parsed as 'elementId:state' => { elementId: state }
				var split = scenename.split(':', 2);

				if (split.length === 2 && split[1]) {

					var scene = {};
					scene[ split[0] ] = split[1];

					this.definescene(scenename, scene);
				}
			}

				// if scene is not yet defined, get it using scenename
			var scene = scene || this._getscene(scenename),
				// build an array with the promises returned by each element.transitate
				_this = this;

			var	elPromises = _.map(scene, function(statename, elementId) {
					return _this.elements[elementId].transitate(statename, options);
				});

			// event
			this.trigger('scene-ini', scenename);

			// pipe the resolution to the defer
			$.when.apply(null, elPromises).then(function() {
				_this.trigger('scene-end', scenename);

				// resolve as last
				defer.resolve();
			});
		},

		// starts the elements to the states defined either in 
		// the element html 'data-state' value.
		start: function(scenename) {
			var scenename = scenename || this.$el.attr('data-iniscene');

			if (scenename) {
				this.transitate(scenename);
			} else {

				var scene = {};

				_.each(this.elements, function(element, id) {
					scene[id] = element.inistate;
				});

				this.transitate(scene);
			}
		},

	});

	return Controller;
});