/*
	steps:
		1- Module startup
		2- State definition
		3- Scene definition
		4- Transition running
*/

define(['transitions'], function(Transitions) {

	/////////////////////////
	// transition startup! //
	/////////////////////////
	window.transitions = Transitions.build({
		$el: $('#transition-list')
	});


	//////////////////////
	// STATE DEFINITION //
	//////////////////////
	/*
		What are 'states'?
		
		Have you ever used jQuery.animate(state, options) method?

		If so, just think of the state object as the .animate method's first argument
		with one improved functionality: 
			states in transitions.js accept functions as parameters. These functions are 
			called when the element is transitated to the state and the function should
			return a valid css value. Great isn't it?

		Each state may be accompanied by a options object, which is passed to the .animate mehtod
		as the second arg (also familiar to the jquery user). I have found it to be unnecessary clutter
		to accept functions as parameters here. You can always override the options object if you need
		whenever you effectively execute the transition!
	*/

	// define one state at a time
	transitions.definestate(
		// 1st arg: statename
		'half-fade',
		// 2nd arg: animate state object
		{
			opacity: 0.5,
			zIndex: 0,
		},
		// 3rd arg: animate options,
		{
			duration: 1000,
			complete: function() { alert('half-fade complete!'); }
		}
	);

	// define multiple states at once
	transitions.definestate(
		// 1st arg: hash object with state name as keys and states as values
		{
			'fadeOut': {
				// you can always pass in a function as a state property
				// this allows for HUGE flexibility.. be creative!
				opacity: function($el) { return $el.attr('data-hide-opacity') || 0; },
				zIndex: 0,
			},
			'fadeIn': {
				opacity: 1,
				zIndex: 1,
			}
		},
		// 2nd arg: hash object with state name as keys and state OPTIONS as values
		{
			'fadeOut': { duration: 1000 },
			'fadeIn': { duration: 1000 },
		}
	);

	//////////////////////
	// SCENE DEFINITION //
	//////////////////////
	/*
		What are 'scenes'?
		In lack for a better name, I have defined a group of 'element states' as a scene.

		In transitions, you always set each element to the right state so that they can form the correct
		scene. As coding these scenes in the middle of execution code might desnecessarily clutter 
		the beauty of the code, you can orderly define the scenes ahead of time, so you may call
		them by their names when needed.

		tl;dr: scenes are groups of element-states
	*/

	// define scenes one by one
	transitions.definescene(
		// 1st arg: scene name
		'odd', 
		// 2nd arg: scene object itself
		{
			first: 'fadeIn',
			second: 'fadeOut',
			third: 'fadeIn',
			fourth: 'fadeOut'
		}
	);

	// define multiple scenes at once
	transitions.definescene(
		// 1st arg: hash object with scene name as keys and scene objects as values
		{
			'even': {
				first: 'fadeOut',
				second: 'fadeIn',
				third: 'fadeOut',
				fourth: 'fadeIn',
			},

			'even-half': {
				first: 'fadeOut',
				second: 'half-fade',
				third: 'fadeOut',
				fourth: 'half-fade',
			}
		}
	);

	////////////////////////////
	// TRANSITIONS (AT LAST!) //
	////////////////////////////
	/*
		Ok, all set up. Now we should see the magic running!

		Call the .transitate(['scene', sceneObj]) method, it accepts an array of
		scenes/sceneobjects. Each item in the array will be executed synchronously.
	*/

	$('#nav li').click(function(e) {
		var objective = $(e.target).attr('data-to');

		switch (objective) {
			case 'all':
			transitions.transitate(['fadeOut', 'fadeIn'])
			break;

			case 'first-half':
			transitions.transitate(['fadeOut', {
				first: 'fadeIn',
				second: 'fadeIn',
			}]);
			break;

			case 'second-half':
			transitions.transitate(['fadeOut', {
				third: 'fadeIn',
				fourth: 'fadeIn',
			}]);
			break;

			case 'odd':
			transitions.transitate(['fadeOut', 'odd']);
			break;

			case 'even':
			transitions.transitate(['fadeOut', 'even']);
			break;

			case 'even-half':
			transitions.transitate(['fadeOut', 'even-half']);
			break;

			default:
			transitions.transitate(['fadeOut', objective + ':fadeIn']);
			break;

		}
	});

	////////////////////////
	// BONUS PACK: events //
	////////////////////////
	/*
		The transition controller itself fires up some events:
			- scene-ini: passes 'scenename' as parameter
			- scene-end: passes 'scenename' as parameter
			- %scenename%-ini: no arg
			- %scenename%-end: no arg

		Each of the transition Elements (accessible via transition.elements[ elementId ]):
			- state-ini: passes 'statename' as parameter
			- state-end: passes 'statename' as parameter
			- %statename%-ini: no arg
			- %statename%-end: no arg
	*/
	// clear the displayer on transition ini
	transitions.on('transition-ini', function() {
		$('#displayer').html('<div>START!</div>');
	});

	transitions.on('scene-ini', function(scenename) {
		$('#displayer').append('<div>'+ scenename +'</div>');
	});

	transitions.on('transition-end', function() {
		$('#displayer').append('<div>FINISH!</div>');
	});


	_.each(transitions.elements, function(element, id) {
		element.on('state-ini', function(statename) {
			element.$el.children('div').html('I am going to... ' + statename);
		});

		element.on('state-end', function(statename) {
			element.$el.children('div').html('I am on \'' + statename + '\' state!');
		})
	});


	/////////////////////
	/// START STUFF UP //
	/////////////////////
	/*
		When you call transitions.start() method, it tries to get data from the
		markup and set elements to the right state.

		each element may define its initial state by setting 'data-inistate'
		the transition object also may define an initial scene by setting 'data-iniscene'

		If you wish, it is also possible to pass a scenename/sceneobject to .start() ! Flexibility first!
	*/

	// start the transitions
	// transitions.start()	// no args, depends on html data-attributes
	transitions.start('odd')		// scenename
	// transitions.start({ first: 'fadeIn' });	// scene object
});