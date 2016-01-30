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
            controls.rotateSpeed = 0.01;
            controls.zoomSpeed = 0.1;
            controls.panSpeed = 0.1;
            controls.noZoom = false;
            controls.noPan = false;
            controls.staticMoving = true;
            controls.dynamicDampingFactor = 0.3;
        } else {
            controls = new THREE.OrbitControls(camera);
            controls.rotateSpeed = 0.1;
            controls.zoomSpeed = 0.1;
            controls.panSpeed = 0.1;
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

    function getLocationSearchHash() {
        var params = window.location.search;
        var map = {};
        if (!params) {
            return map;
        }
        var paramsArr = params.replace(/^\?/, '').replace(/\/$/, '').split('&');
        paramsArr.forEach(function (keqv) {
            var kv = keqv.split('=');
            map[kv[0]] = kv[1];
        });
        return map;
    }

    function init() {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(params.focalLength, window.innerWidth / window.innerHeight, .1, 1000);
        camera.position.z = 500;

        scene.fog = new THREE.FogExp2(0x333333, 0.001);
        renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setClearColor(scene.fog.color);
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        // Enable effect optionally
        var searchHash = getLocationSearchHash();
        if (searchHash.vr) {
            setStereoEffect({oculus: searchHash.vr === '1'});
        }

        //addParamsGui(); // Does not work well with trackball controls
        addAxis();
        addLights();
        addControls({trackball: true});
        //addStats();
        addPointsFromData(generateData(100));

        window.addEventListener('resize', resize, false);

        render();
    }

    function getRandInt(x) {
        return Math.floor(Math.random() * x);
    }

    function generateData(n) {
        var data = [];
        var now = Math.floor(Date.now()/1000);
        for (var i = 0; i < n; i++) {
            var obj = {
                epoch: now - i*86400,
                values: [getRandInt(30), getRandInt(10), getRandInt(40), getRandInt(20)]
            };
            data.push(obj);
        }
        return data;
    }

    function addPointsFromData(data) {
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
        controls.update();
    }

    init();
    animate();
});
