import * as THREE from 'three';
import Papa from 'papaparse';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, moon, controls;
const intersectedObjects = [];  // Ensure it's initialized here
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();  // Ensure it's initialized here
function init() {
    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Add stars
    for (let i = 0; i < 1000; i++) {
        const starGeometry = new THREE.SphereGeometry(0.005, 24, 24);
        const starMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const star = new THREE.Mesh(starGeometry, starMaterial);

        star.position.x = (Math.random() - 0.5) * 10;
        star.position.y = (Math.random() - 0.5) * 10;
        star.position.z = (Math.random() - 0.5) * 10;

        scene.add(star);
    }

    // Moon
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const loader = new THREE.TextureLoader();
    const moonTexture = loader.load('moon_texture.jpg');
    const material = new THREE.MeshStandardMaterial({ map: moonTexture });
    moon = new THREE.Mesh(geometry, material);
    scene.add(moon);

    // Light
    const ambientLight = new THREE.AmbientLight(0x555555);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Orbit Controls
    controls = new OrbitControls(camera, renderer.domElement);

    // Window resize event
    window.addEventListener('resize', onWindowResize, false);

    // Load CSV data and process
    Papa.parse("cleaned_data.csv", {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function(results) {
            processData(results.data);
        }
    });

    // Add mouse move listener for the hover effect
    //document.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('click', onMouseClick);
}
function onMouseClick(event) {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(intersectedObjects);

    const infoBox = document.getElementById('infoBox');

    if (intersects.length > 0) {
        // Update details in the pop-up
        const detailsDiv = document.getElementById('moonquakeDetails');
        detailsDiv.style.display = 'block';

        const detailsText = document.getElementById('quakeDetails');
        detailsText.innerHTML = `
            Date: ${intersects[0].object.userData.Date}<br>
            Latitude: ${intersects[0].object.userData.Lat}<br>
            Longitude: ${intersects[0].object.userData.Long}<br>
            Type: ${intersects[0].object.userData.Type}<br>
            Source: ${intersects[0].object.userData.Source}
        `;

        // Show and animate the corresponding ring sprite
        if (!intersects[0].object.userData.isRing) {
            const ringSprite = intersectedObjects.find(obj => obj.userData.isRing && obj.userData.parent === intersects[0].object);
            if (ringSprite) {
                ringSprite.material.opacity = 0.8;  // Set to visible
                ringSprite.scale.set(0.05, 0.05, 0.05);  // Reset scale

                // Start the animation
                gsap.to(ringSprite.scale, {
                    x: 0.1,  // Adjust as needed
                    y: 0.1,
                    duration: 1,
                    ease: 'power1.out',
                    onComplete: () => {
                        ringSprite.material.opacity = 0;  // Hide after animation
                    }
                });
            }
        }
    }
}


function processData(data) {
    data.forEach(entry => {
        const { Lat, Long, Date, RawType, Type, Source } = entry;

        //console.log(entry);
        const radius = 1.01; // Slightly above the moon's surface
        const phi = (90 - Lat) * (Math.PI / 180);
        const theta = (Long + 180) * (Math.PI / 180);

        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        const loader = new THREE.TextureLoader();
        const ringTexture = loader.load('ring.webp');
        const circleTexture = loader.load('circle.webp');

        const spriteMaterial = new THREE.SpriteMaterial({
            color: Type === "Artifical Impacts" ? 0xff0000 : 0x00ff00,
            map: circleTexture, // using the circle texture as an alpha map
            transparent: true
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(x, y, z);
        sprite.scale.set(0.03, 0.03, 0.03);

        sprite.userData = { Date, RawType, Type, Source };  // Store data for use in the hover event

        scene.add(sprite);
        intersectedObjects.push(sprite);
        const ringMaterial = new THREE.SpriteMaterial({
            map: ringTexture,
            transparent: true,
            opacity: 0 // Initially hidden
        });
        const ringSprite = new THREE.Sprite(ringMaterial);
        ringSprite.position.set(x, y, z);
        ringSprite.scale.set(0.05, 0.05, 0.05);
        ringSprite.userData = { isRing: true, parent: sprite };
        scene.add(ringSprite);
    });
}

function onMouseMove(event) {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(intersectedObjects);

    const infoBox = document.getElementById('infoBox');
    if (intersects.length > 0) {
        const intersected = intersects[0];
        infoBox.innerHTML = `
            Date: ${intersected.object.userData.Date}<br>
            Type: ${intersected.object.userData.Type}<br>
            Source: ${intersected.object.userData.Source}<br>
        `;
        infoBox.style.top = `${event.clientY}px`;
        infoBox.style.left = `${event.clientX}px`;
        infoBox.style.display = 'block';
    } else {
        infoBox.style.display = 'none';
    }

}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

init();
animate();
