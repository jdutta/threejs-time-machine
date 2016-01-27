$(document).ready(function () {
    var scene, camera, renderer, effect, controls, stats;

    var params = {
        focalLength: 35
    };

    var AMB_LIGHT_COLOR = 0x333333;
    var DIR_LIGHT_COLOR = 0xffffff;

    function addAxis() {
        var axisHelper = new THREE.AxisHelper(5000);
        scene.add(axisHelper);
    }

    function addLights() {
        var ambLight = new THREE.AmbientLight(AMB_LIGHT_COLOR);
        scene.add(ambLight);

        var light1 = new THREE.DirectionalLight(DIR_LIGHT_COLOR);
        light1.position.set(0, 1, 1);
        //light1.add(new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 8), new THREE.MeshBasicMaterial({ color: DIR_LIGHT_COLOR })));
        scene.add(light1);
    }

    function addControls(params) {
        if (!!params.trackball) {
            controls = new THREE.TrackballControls(camera);
            controls.rotateSpeed = 0.1;
            controls.zoomSpeed = 0.1;
            controls.panSpeed = 0.1;
            controls.noZoom = false;
            controls.noPan = false;
            controls.staticMoving = true;
            controls.dynamicDampingFactor = 0.3;
        } else {
            controls = new THREE.OrbitControls(camera);
            controls.rotateSpeed = 0.5;
            controls.zoomSpeed = 0.2;
            controls.panSpeed = 0.2;
        }
        controls.addEventListener('change', render);
    }

    function addStats() {
        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = '0px';
        stats.domElement.style.zIndex = 100;
        document.body.appendChild(stats.domElement);
    }

    function resize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (!!effect) {
            effect.setSize(window.innerWidth, window.innerHeight);
        }
        //render(); // may be expensive
    }

    function setStereoEffect(params) {
        // Creates the Stereo Effect for the VR experience.
        if (!!params.oculus) {
            effect = new THREE.OculusRiftEffect(renderer);
        } else {
            effect = new THREE.StereoEffect(renderer);
        }
        effect.setSize(window.innerWidth, window.innerHeight);
    }

    function addParamsGui() {
        var gui = new dat.GUI();
        gui.add(params, 'focalLength', { '15mm': 15, '35mm': 35, '50mm': 50 } );
        gui.open();
    }

    function init() {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(params.focalLength, window.innerWidth / window.innerHeight, .1, 1000);
        camera.position.z = 50;

        scene.fog = new THREE.FogExp2(0x333333, 0.001);
        renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setClearColor(scene.fog.color);
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        // Enable effect optionally
        //setStereoEffect({oculus: true});

        //addParamsGui(); // Does not work well with trackball controls
        addAxis();
        addLights();
        addControls({trackball: false});
        //addStats();
        addPointsFromData(processData(generateData(4)));

        window.addEventListener('resize', resize, false);

        render();
    }

    function getRandInt(x) {
        return Math.floor(Math.random() * x);
    }

    // n: number of levels
    function generateData(n, level, nodeIndex) {
        level = level || 0;
        nodeIndex = nodeIndex || 0;
        var levelObj = {};
        levelObj.name = 'level_' + level + '_node_' + nodeIndex;
        if (level < n-1) {
            var children = [];
            var childCount = 1 + getRandInt(4);
            for (var i = 0; i < childCount; i++) {
                children.push(generateData(n, level+1, i));
            }
            levelObj.children = children;
        } else {
            levelObj.value = getRandInt(10);
        }

        return levelObj;
    }

    // Add layout info to input data
    function processData(data, level, siblingIndex) {
        var GAP_X = 7;
        var GAP_Y = 3;
        var GAP_Z = 0;
        var y = 0;

        function applyCoords(data, level) {
            siblingIndex = siblingIndex || 0;
            level = level || 0;
            data.level = level;
            data.coords = {
                x: GAP_X * level,
                y: GAP_Y * y++,
                z: GAP_Z * level
            };
            console.log('coordsy', data.coords.y)
            if (!!data.children) {
                for (var i = 0; i < data.children.length; i++) {
                    applyCoords(data.children[i], level + 1);
                }
            }
            return data;
        }
        return applyCoords(data);
    }

    function addPointsFromData(node, parentNode) {
        var coords = node.coords;
        var nodeSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 10), new THREE.MeshLambertMaterial({color: 0xffffff}));
        nodeSphere.position.x = coords.x;
        nodeSphere.position.y = coords.y;
        nodeSphere.position.z = coords.z;
        scene.add(nodeSphere);

        if (!!parentNode) {
            var pCoords = parentNode.coords;
            var geom = new THREE.Geometry();
            geom.vertices.push(new THREE.Vector3(pCoords.x, pCoords.y, pCoords.z));
            geom.vertices.push(new THREE.Vector3(coords.x, coords.y, coords.z));
            var material = new THREE.LineBasicMaterial({
                color: 0xffffff,
                linewidth: 2
            });
            var line = new THREE.Line(geom, material);
            scene.add(line);
        }

        if (!!node.children) {
            for (var i = 0; i < node.children.length; i++) {
                addPointsFromData(node.children[i], node);
            }
        }
    }

    // TODO remove
    function addPointsFromDataXXX(data) {
        var PLANE_SIZE = 10;
        var PLANE_COLOR = 0xaaaaaa;
        var BOX_SIZE = 1;
        var SEQ_TEXT_SIZE = 0.5;
        var POINT_INFO_TEXT_SIZE = 0.1;

        var n = data.length;
        var highestEpoch = d3.max(data, function (o) { return o.epoch; });
        var highestValue = d3.max(data, function (o) {
            return d3.max(o.values);
        });
        var xScale = d3.scale.ordinal()
            .domain(d3.range(data[0].values.length))
            .rangeRoundPoints([-PLANE_SIZE/2, PLANE_SIZE/2], 0.5);
        var valScale = d3.scale.linear()
            .domain([0, highestValue])
            .range([0, PLANE_SIZE/2]);
        var colorScale = d3.scale.linear()
            .domain([0, highestValue])
            .range(['#9aca40', '#ff3300']);

        for (var i = 0; i < n; i++) {
            var obj = data[i];
            var epochDiff = highestEpoch - obj.epoch;
            var zPos = epochDiff/8640;

            var planeGroup = new THREE.Group();
            scene.add(planeGroup);

            var plane = new THREE.Mesh(new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE), new THREE.MeshBasicMaterial({
                color: PLANE_COLOR,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.1
            }));
            plane.position.z = zPos;
            planeGroup.add(plane);

            var seqNumTextShape = THREE.FontUtils.generateShapes(new Date(obj.epoch*1000).toDateString(), {
                font: 'helvetiker',
                size: SEQ_TEXT_SIZE
            } );
            var seqNumTextGeom = new THREE.ShapeGeometry(seqNumTextShape);
            var textMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, overdraw: 0.5, transparent: true, opacity: 0.4});
            var seqNumText = new THREE.Mesh(seqNumTextGeom, textMaterial);
            seqNumText.position.x = -PLANE_SIZE/2;
            seqNumText.position.y = -PLANE_SIZE/2;
            seqNumText.position.z = zPos + 0.1;
            planeGroup.add(seqNumText);

            for (var j = 0; j < obj.values.length; j++) {
                var boxColor = colorScale(obj.values[j]);
                var pointBox = new THREE.Mesh(new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, 0.1), new THREE.MeshLambertMaterial({color: boxColor}));
                pointBox.position.x = xScale(j);
                pointBox.position.y = valScale(obj.values[j]);
                pointBox.position.z = zPos;
                planeGroup.add(pointBox);

                var pointInfoTextShape = THREE.FontUtils.generateShapes('' + obj.values[j], {
                    font: 'helvetiker',
                    size: POINT_INFO_TEXT_SIZE
                } );
                var pointInfoTextGeom = new THREE.ShapeGeometry(pointInfoTextShape);
                var pointInfoText = new THREE.Mesh(pointInfoTextGeom, textMaterial);
                pointInfoText.position.x = pointBox.position.x - BOX_SIZE / 2 + POINT_INFO_TEXT_SIZE * 0.5;
                pointInfoText.position.y = pointBox.position.y + BOX_SIZE / 2 - POINT_INFO_TEXT_SIZE * 1.5;
                pointInfoText.position.z = zPos + 0.1;
                planeGroup.add(pointInfoText);
            }

            if (camera.position.z < zPos) {
                camera.position.z = zPos + 30;
                controls.maxDistance = camera.position.z;
            }
        }
    }

    function render() {
        if (!!effect) {
            effect.render(scene, camera);
        } else {
            renderer.render(scene, camera);
        }
        if (!!stats) {
            stats.update();
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        if (!!controls) {
            controls.update();
        }
    }

    init();
    animate();
});
