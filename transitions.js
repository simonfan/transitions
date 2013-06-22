define(['jquery','buildable','backbone','underscore','_.mixins'], 
function(   $   , Buildable , Backbone , undef      , undef    ) {

	////////////////////////
	// TRANSITION METHODS //
	////////////////////////
	var T = {
		fadeIn: function(defer, options) {
			options = options || {};
			options = _.extend(options, {
				done: function() {
					defer.resolve();
				}
			})

			this.$li.animate({ opacity: 1 }, options);
		},

		fadeOut: function(defer, options) {
			options = options || {};
			options = _.extend(options, {
				done: function() {
					defer.resolve();
				}
			})

			this.$li.animate({ opacity: 0 }, options);
		}
	};


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
					id: ['string','number','undefined'],
					$li: 'object',

					// show and hide methods
					show: ['string','undefined'],
					hide: ['string','undefined'],

					// optionally pass in other statuses
					otherStatuses: ['object','undefined'],

					// show and hide options
					animateoptions: ['object', 'undefined'],
				}
			});

			// bind methods!
			_.bindAll(this);

			this.id = data.id || data.$li.prop('id');
			this.$li = data.$li;

			// this.$el is just the a reference to this.$li
			this.$el = this.$li;

			///////////////
			//// options //
			///////////////

			// the transition methods (may contain methods other than show and hide)
			var otherStatuses = data.otherStatuses || {};
			this.transitionMethods = _.extend(otherStatuses, {
				show: data.show || 'fadeIn',
				hide: data.hide || 'fadeOut',
			});

			// the options passed to the transition methods.
			this.animateoptions = data.animateoptions || {};

			//////////////
			/// status ///
			//////////////
			this.state = this.$li.css('opacity') > 0 ? 'show' : 'hide';
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
			this.transition = 'on-transition';

			this.trigger(state + '-ini');
		},

		_handleEnd: function(state) {
			this.state = state;

			this.trigger(state + '-end')
				.trigger(state);
		},

		/////////////////
		////// API //////
		/////////////////

		// transitate is a general method that allows transitions
		// using any of the defined transition methods defined, including
		// the 'hide' and 'show'
		transitate: function(state, options) {
			// only do stuff if the transition method is defined in the page obj
			if (this.transitionMethods[ state ]) {
				return this._transitate(state, options);
			} else {
				throw new Error('Transition method for "' + state +'" is not defined on "'+ this.id +'".');
			}
		},

		// transitate helper
		_transitate: function(state, options) {
			// INI //
			// trigger state transition init
			this.trigger('transition-ini', state);

			// check current state
			if (this.state === state) {
				// if the required state is the current state, trigger the transition END
				// and return true (an accomplished promise)
				this.trigger('transition-end', state);

				return true;

			} else {

				// SETUP //
				var _this = this,
					defer = $.Deferred(),
					options = _.extend({}, this.animateoptions, options);

				// END //
				$.when(defer).then(function() {
					// trigger state transition end
					_this.trigger('transition-end', state);
				});

				// TRANS //
				T[ this.transitionMethods[ state ] ].call(this, defer, options);

				return defer;
			}
		},

		// shortcut for built in show method
		show: function(options) {
			return this._transitate('show', options);
		},

		// shortcut for built in hide method
		hide: function(options) {
			return this._transitate('hide', options);
		},


		// set the default animation options to be passed to the transition method
		setAnimateOptions: function(options) {
			this.animateoptions = options;
		},

		// set the transition method name 
		setTransitionMethod: function(type, method) {
			// type: show/hide
			// method: method (fadeIn, fadeOut, etc.)
			this.transitionMethods[ type ] = method;
		}
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


			// states
			this.states = _.extend({}, data.states);
			// a 'state' is an hash-object that contains element ids as keys and the 
			// desired element-state as values: { el-id: el-state }

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

				_this.elements[ id ] = Element.build({
					$li: $li,
					id: id,
				});
			});
		},

		/////////////////
		////// API //////
		/////////////////
		showElements: function(elementIds, synchronous, options) {

			var _this = this,
				hideEls = _.difference( _.keys(this.elements), elementIds);

			if (synchronous) {

				var hideDefer = this.transitateElements(hideEls, 'hide', options);
				
				return $.when(hideDefer).then(function() {
					_this.transitateElements(elementIds, 'show', options);
				});

			} else {
				// asynch
				var hideDefer = this.transitateElements(hideEls, 'hide', options),
					showDefer = this.transitateElements(elementIds, 'show', options);

				return $.when.apply(null, [hideDefer, showDefer]);
			}
		},

		// transitates elements to a same state.
		transitateElements: function(elementIds, state, options) {
			// elementIds: string or array
			elementIds = _.isArray(elementIds) ? elementIds : [elementIds];

			// build a state object
			var states = {};

			_.each(elementIds, function(id, index) {
				states[ id ] = state;
			});

			return this.to(states, options);
		},

		// general method that accepts strings, arrays and state objects
		// and behaves accordingly.
		to: function(name_or_states, options) {

			var type = typeof name_or_states;

			if (type === 'string') {
				// assume name_or_states is a state name

				if (!this.states[ name_or_states ]) {
					throw new Error('State "' + name_or_states +'" is not defined.');
				}

				return this._to(this.states[ name_or_states ], options);

			} else if (type === 'object') {
				// if it is an object, assume it is an state object
				return this._to(name_or_states, options);
			}
		},

		// to helper. 
		_to: function(states, options) {
			// states must be a states object indicating at which states each of the 
			// elements should be.

			var _this = this,
				defer = $.Deferred(),
				elDefers = [];			// var to hold all element transition deferrals

			_.each(states, function(elState, elId) {
				// a 'states' is an hash-object that contains element ids as keys and the 
				// desired element-state as values: { el-id: el-state }

				var element = _this.elements[ elId ];

				elDefers.push(element.transitate(elState, options));
			});

			// when all the element transitions are done, resolve the master defer
			$.when.apply(null, elDefers).then(function() {
				defer.resolve();
			});

			return defer;
		},

		// define a state
		defineState: function(name, state) {
			this.states[ name ] = state;
		},

		// define a transition function
		defineTransitionMethod: function(name, func) {
			T.name = func;
		},


	});

	return Transitions;
});