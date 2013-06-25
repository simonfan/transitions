define(['transitions'], function(Transitions) {

	window.transitions = Transitions.build({
		$el: $('#transition-list'),
	});


	transitions.definestate(
		{
			'fadeOut': {
				opacity: 0,
				zIndex: 0,
			},
			'fadeIn': {
				opacity: 1,
				zIndex: 1,
			}
		},
		{
			'fadeOut': { duration: 300 },
			'fadeIn': { duration: 2500 },
		}
	);

	transitions.definescene('first', {
		first: 'fadeIn',
		second: 'fadeOut',
		third: 'fadeOut',
	});


	$('#nav li').click(function(e) {
		var objective = {};
		objective[$(e.target).attr('data-to')] = 'fadeIn';
		transitions.transitate(['fadeOut', objective])
	});




	// start the transitions
	transitions.start();
});