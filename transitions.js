define(['jquery','buildable','backbone','underscore','_.mixins'], 
function(   $   , Buildable , Backbone , undef      , undef    ) {
	//////////////////
	///// STATES /////
	//////////////////
	// states are individual element style objects
	var __states = {};


	//////////////////
	///// SCENES /////
	//////////////////
	// scenes are hashes with the element ids as keys and the state
	// each element should be at as 
	var __scenes = {};

	////////////////////////////
	// TRANSITIONABLE ELEMENT //
	////////////////////////////

	var Element = Object.create(Buildable);

	Element.extend(Backbone.Events, {
		init: function(data) {
			_.interface({
				id: 'Element init',
				obj: data,
				typeofs: {
				//	id: ['string','number','undefined'],
					$li: 'object',
				}
			});

			// bind methods!
			_.bindAll(this);

			this.id = data.id || data.$li.prop('id');
			this.$li = data.$li;

			// this.$el is just the a reference to this.$li
			this.$el = this.$li;

			//////////////
			/// status ///
			//////////////
			this.state = this.$li.prop('data-state')
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
				state = _.clone( __states[statename] );

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
				var state = this._getstate(statename);

				return this.$el.animate(state, options);
			}
		},
	});



	////////////////
	// CONTROLLER //
	////////////////

	var Transitions = Object.create(Buildable);

	Transitions.extend(Backbone.Events, {
		init: function(data) {
			_.interface({
				id: 'Transitions init',
				obj: data,
				typeofs: {
					id: ['string','undefined'],
					$ul: 'object',

					states: ['object', 'undefined'],

					animateoptions: ['object','undefined'],
				}
			});

			this.$ul = data.$ul;
			this.elements = {};

			// options
			this.animateoptions = data.animateoptions || {};

			// build
			this._build();
		},

		_build: function() {
			this._findItems();
		},

		_findItems: function() {
			var _this = this;

			_.each(this.$ul.children('li'), function(li, index) {
				var $li = $(li),
					id = $li.prop('id');

				if (!id) {
					id = 'page-' + index;
					$li.prop('id', id);
				}

				_this.elements[ id ] = Element.build({ $li: $li });
			});
		},

		// conditional chain:
		// 1: retrieves a scene object with the given name
		// 2: retrieves a state with the given name and returns a scene object that 
		//	  sets all elements to that state
		// 3: false
		_getScene: function(name) {
			if (__scenes[name]) {
				return __scenes[name];

			} else if (__states[name]) {
				var scene = {};

				_.each(this.elements, function(element, id) {
					scene[id] = __states[name];
				})

				return scene;
			}
		},

		/////////////////
		////// API //////
		/////////////////
		definestate: function(name, state) {
			__states[ name ] = state;
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
					var options = optionsIsArray ? options[index] : options;

					// add a task per scene
					taskrunner.add(index, function(defer) {
						_this.transitate(defer, scene, options);
					});
				})

				return taskrunner.run();

			} else {
				// scenes = a single scene
				var defer = $.Deferred();

				this._transitate(defer, scene);

				return defer;
			}
		},

		// _transitate is a helper function that runs one scene only
		_transitate: function(defer, scene, options) {
			var scene = (typeof scene === 'object') ? scene : this._getScene(scene),
				// build an array with the promises returned by each element.transitate
				_this = this,
				elPromises = _.map(scene, function(state, elementId) {
					return _this.elements[elementId].transitate(state, options);
				});

			// pipe the resolution to the defer
			defer = $.when.apply(null, elPromises);
		},
		

	});

	return Transitions;
});