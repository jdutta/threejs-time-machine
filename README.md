# threejs-time-machine
A time-machine viz using both THREE.js and d3.

THREE.js makes WebGL powered 3D graphics easier and by now it is supported in major browsers. Here is the experiment to
visualize time-series based data. Let us consider that at each timestamp we have values of multiple series/category.
We can traverse through the time like in a time machine. The depth perception is made realistic by the use of
translucent panes of glass at each timestamp, and also we have a subtle fog effect to fade out values far out.

d3.js on the other hand is very useful for things like scales, for this particular example.
