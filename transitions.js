define(['jquery','buildable','taskrunner','backbone','underscore','_.mixins'], 
function(   $   , Buildable , Taskrunner , Backbone , undef      , undef    ) {
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
			this.state = this.$el.prop('data-state');
			this.transition = 'stopped';

			// build
			this._build();
		},

		_build: function() {
			this._setupEvents();
		},

		_setupEvents: function() {
			this.on('transition-ini', this._handleIni);
			this.on('transition-end', this._handleEnd);
		},

		_handleIni: function(state) {
			this.transition = 'active';

			this.trigger(state + '-ini');
		},

		_handleEnd: function(state) {
			this.transition = 'stopped';
			this.state = state;

			this.trigger(state + '-end')
				.trigger(state);
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
					state[ name ] = item.call(_this.$el);
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
			if (this.state === statename) {
				return true;
			} else {
				var state = this._getstate(statename),
					options = _.extend({}, this.__stateOptions[ statename ], options);

				return this.$el.animate(state, options);
			}
		},
	});



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
				}
			});

			this.$el = data.$el;
			this.elements = {};

			// states
			this.__states = data.states || {};

			// state options
			this.__stateOptions = data.__stateOptions || {};

			// scenes
			this.__scenes = data.scenes || {};

			// build
			this._build();
		},

		_build: function() {
			this._findItems();
		},

		_findItems: function() {
			var _this = this;

			_.each(this.$el.children('li'), function(li, index) {
				var $li = $(li),
					id = $li.prop('id');

				if (!id) {
					id = 'page-' + index;
					$li.prop('id', id);
				}

				_this.elements[ id ] = Element.build({ controller: _this, $el: $li });
			});
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

		definescene: function(name, scene) {

		},

		// receives an array of scenes to be performed synchronously
		transitate: function(scenes, options) {
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

					// add a task per scene
					taskrunner.add(index, function(defer) {
						_this._transitate(defer, scene, sceneOptions);
					});
				});

				return taskrunner.run();

			} else {
				// scenes = a single scene
				var defer = $.Deferred();

				this._transitate(defer, scenes, options);

				return defer;
			}
		},

		// _transitate is a helper function that runs one scene only
		_transitate: function(defer, scene, options) {
			var scene = (typeof scene === 'object') ? scene : this._getscene(scene),
				// build an array with the promises returned by each element.transitate
				_this = this,
				elPromises = _.map(scene, function(statename, elementId) {
					return _this.elements[elementId].transitate(statename, options);
				});

			// pipe the resolution to the defer
			$.when.apply(null, elPromises).then(defer.resolve);
		},
		

	});

	return Controller;
});