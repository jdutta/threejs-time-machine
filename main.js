$(document).ready(function () {
    var scene, camera, renderer, effect, controls, stats;

    var params = {
        focalLength: 35
    };

    var AMB_LIGHT_COLOR = 0x333333;
    var DIR_LIGHT_COLOR = 0xffff00;

    function addAxis() {
        var axisHelper = new THREE.AxisHelper(5000);
        scene.add(axisHelper);
    }

    function addLights() {
        var ambLight = new THREE.AmbientLight(AMB_LIGHT_COLOR);
        scene.add(ambLight);

        var light1 = new THREE.DirectionalLight(DIR_LIGHT_COLOR);
        light1.position.set(0, 0, 50);
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
            controls.zoomSpeed = 0.3;
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
        camera = new THREE.PerspectiveCamera(params.focalLength, window.innerWidth / window.innerHeight, .1, 2000);
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
        addPointsFromData(processData(generateData(5)));

        window.addEventListener('resize', resize, false);

        render();
    }

    // 0 <= n < x
    function getRandInt(x) {
        return Math.floor(Math.random() * x);
    }

    // -x/2 <= n < x/2
    function getRandIntSymmetric(x) {
        return Math.floor(Math.random() * x - x / 2);
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
    function processData(data) {

        var nLeafNodes = 0;
        function calcLeafNodes(node) {
            if (!node.children) {
                nLeafNodes++;
            } else {
                node.children.forEach(calcLeafNodes);
            }
            return nLeafNodes;
        }
        calcLeafNodes(data);

        var treeHeight = nLeafNodes * 5;
        var treeWidth = 100;
        var tree = d3.layout.tree()
            .size([treeHeight, treeWidth]);
        var nodes = tree.nodes(data),
            links = tree.links(nodes);

        // Assign z-values randomly
        function assignRandomZ() {
            var link0 = links[0];
            var linkLen = (new THREE.Vector3(link0.source.x, link0.source.y, link0.source.z)).sub(new THREE.Vector3(link0.target.x, link0.target.y, link0.target.z)).length();
            var xThetaMax = 20;
            nodes.forEach(function (node) {
                node.z = 0;
                if (!!node.parent) {
                    if (node.parent.children.length > 1) {
                        var xTheta = getRandIntSymmetric(xThetaMax) * Math.PI / 180;
                        node.z = node.parent.z + linkLen * Math.sin(xTheta);
                        node.y = node.y - linkLen * (1 - Math.cos(xTheta));
                    } else {
                        node.z = node.parent.z;
                    }
                }
            });
        }
        assignRandomZ();

        return {
            nodes: nodes,
            links: links
        };
    }

    function addPointsFromData(treeData) {
        treeData.nodes.forEach(function (node) {
            var nodeSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 10), new THREE.MeshLambertMaterial({color: 0xffffff}));
            nodeSphere.position.x = node.x;
            nodeSphere.position.y = node.y;
            nodeSphere.position.z = node.z;
            scene.add(nodeSphere);
        });
        //camera.up.set(-1, 0, 0);
        camera.position.set(treeData.nodes[treeData.nodes.length - 1].x/2, treeData.nodes[0].y, 100);
        controls.target.set(treeData.nodes[treeData.nodes.length - 1].x/2, treeData.nodes[0].y, 0);

        treeData.links.forEach(function (link) {
            var src = link.source;
            var tgt = link.target;
            var geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3(src.x, src.y, src.z));
            geometry.vertices.push(new THREE.Vector3(tgt.x, tgt.y, tgt.z));
            var material = new THREE.LineBasicMaterial({
                color: 0xffffff,
                linewidth: 2
            });
            var line = new THREE.Line(geometry, material);
            scene.add(line);
        });
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
