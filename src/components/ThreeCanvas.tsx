import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PatientProfile, VesselSegment } from '../types/cardiac';
import { Activity, Eye, Layers, RotateCcw, Volume2, VolumeX, Zap } from 'lucide-react';

interface ThreeCanvasProps {
  patient: PatientProfile;
  selectedVessel: VesselSegment | null;
  onSelectVessel: (vessel: VesselSegment) => void;
  isStentingActive?: boolean;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  patient,
  selectedVessel,
  onSelectVessel,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const reqIdRef = useRef<number | null>(null);

  // Heart meshes and references
  const heartGroupRef = useRef<THREE.Group | null>(null);
  const thoraxGroupRef = useRef<THREE.Group | null>(null);
  const myocardiumMeshRef = useRef<THREE.Mesh | null>(null);
  const particlesGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Interactive UI state
  const [showThorax, setShowThorax] = useState(true);
  const [showFlow, setShowFlow] = useState(true);
  const [showIschemiaMap, setShowIschemiaMap] = useState(true);
  const [isBeating, setIsBeating] = useState(true);
  const [heartRate, setHeartRate] = useState(patient.restingHeartRate || 72);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [hoveredVesselName, setHoveredVesselName] = useState<string | null>(null);

  // Sync heart rate if patient changes
  useEffect(() => {
    setHeartRate(patient.restingHeartRate || 72);
  }, [patient.restingHeartRate]);

  // Audio Context for realistic Cardiac "Lub-Dub" sound synthesis
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastBeatTimeRef = useRef<number>(0);

  const playHeartSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // S1 "Lub" (Mitral/Tricuspid closure)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(65, now);
      osc1.frequency.exponentialRampToValueAtTime(35, now + 0.12);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // S2 "Dub" (Aortic/Pulmonic closure) ~ 0.28s later
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(85, now + 0.28);
      osc2.frequency.exponentialRampToValueAtTime(45, now + 0.38);
      gain2.gain.setValueAtTime(0.25, now + 0.28);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.40);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.28);
      osc2.stop(now + 0.42);
    } catch {
      // Audio playback quiet fallback
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x090d16);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0.5, 5.2);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2.0;
    controls.maxDistance = 9.0;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight2.position.set(-6, -2, -4);
    scene.add(dirLight2);

    const redRimLight = new THREE.PointLight(0xf43f5e, 2.5, 10);
    redRimLight.position.set(2, -3, 3);
    scene.add(redRimLight);

    // BUILD ANATOMICAL ENVIRONMENT
    const thoraxGroup = new THREE.Group();
    thoraxGroupRef.current = thoraxGroup;
    scene.add(thoraxGroup);

    // 1. Thoracic Cage Silhouette (Semi-transparent ribs and spine)
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.18,
      roughness: 0.5,
      metalness: 0.1,
      wireframe: false,
    });

    // Rib cage curves
    for (let i = -3; i <= 3; i++) {
      const radiusX = 1.7 + Math.cos(i * 0.4) * 0.4;
      const radiusY = 1.3;
      const ribCurve = new THREE.EllipseCurve(
        0,
        i * 0.4,
        radiusX,
        radiusY,
        0,
        2 * Math.PI,
        false,
        0
      );
      const points = ribCurve.getPoints(50);
      const ribGeo = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, p.y, Math.sin(p.x * 1.2) * 0.4 - 0.2))),
        40,
        0.035,
        8,
        false
      );
      const ribMesh = new THREE.Mesh(ribGeo, ribMat);
      thoraxGroup.add(ribMesh);
    }

    // Sternum (Front Breastbone)
    const sternumGeo = new THREE.BoxGeometry(0.35, 2.4, 0.08);
    const sternumMat = new THREE.MeshStandardMaterial({
      color: 0xa0aec0,
      transparent: true,
      opacity: 0.22,
    });
    const sternum = new THREE.Mesh(sternumGeo, sternumMat);
    sternum.position.set(0, 0, 1.35);
    thoraxGroup.add(sternum);

    // Spine Column (Back)
    const spineGeo = new THREE.CylinderGeometry(0.18, 0.18, 3.2, 16);
    const spine = new THREE.Mesh(spineGeo, ribMat);
    spine.position.set(0, 0, -1.35);
    thoraxGroup.add(spine);

    // 2. HEART MODEL GROUP
    const heartGroup = new THREE.Group();
    heartGroupRef.current = heartGroup;
    scene.add(heartGroup);

    // Reconstruct the 3D anatomical heart whenever patient changes
    rebuildHeartModel(heartGroup, patient);

    // Animate blood particles
    const particlesGroup = new THREE.Group();
    particlesGroupRef.current = particlesGroup;
    heartGroup.add(particlesGroup);
    setupBloodFlowParticles(particlesGroup, patient);

    // Resize Handler
    const handleResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Raycasting for interactive hover and click
    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(heartGroup.children, true);
      const vesselHit = intersects.find((hit) => hit.object.userData && hit.object.userData.isVessel);
      if (vesselHit) {
        container.style.cursor = 'pointer';
        setHoveredVesselName(vesselHit.object.userData.name);
      } else {
        container.style.cursor = 'grab';
        setHoveredVesselName(null);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(heartGroup.children, true);
      const vesselHit = intersects.find((hit) => hit.object.userData && hit.object.userData.isVessel);
      if (vesselHit) {
        const vesselData = vesselHit.object.userData.vesselSegment as VesselSegment;
        if (vesselData) {
          onSelectVessel(vesselData);
        }
      }
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('click', handleClick);

    // Render loop
    let clock = new THREE.Clock();
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Heartbeat pulse cycle
      if (isBeating && heartGroupRef.current) {
        const bps = heartRate / 60;
        const beatCycle = (elapsed * bps) % 1; // 0 to 1

        // Systolic contraction curve: rapid contraction, gentle recoil
        let pulseScale = 1.0;
        if (beatCycle < 0.18) {
          pulseScale = 1.0 - Math.sin((beatCycle / 0.18) * Math.PI) * 0.085;
        } else if (beatCycle < 0.38) {
          pulseScale = 1.0 + Math.sin(((beatCycle - 0.18) / 0.2) * Math.PI) * 0.045;
        }

        heartGroupRef.current.scale.set(pulseScale, pulseScale * 1.02, pulseScale);

        // Sound trigger at systolic peak
        if (beatCycle < 0.05 && elapsed - lastBeatTimeRef.current > 60 / heartRate * 0.8) {
          playHeartSound();
          lastBeatTimeRef.current = elapsed;
        }
      }

      // Animate blood flow particles along vessels
      if (particlesGroupRef.current && showFlow) {
        particlesGroupRef.current.children.forEach((p: any) => {
          if (p.userData && p.userData.curve) {
            p.userData.progress = (p.userData.progress + p.userData.speed) % 1.0;
            const pt = p.userData.curve.getPointAt(p.userData.progress);
            p.position.copy(pt);
          }
        });
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('click', handleClick);
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      renderer.dispose();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [patient]);

  // Effect to rebuild vessels & materials when patient parameters update (e.g., stenting or slider edit)
  useEffect(() => {
    if (heartGroupRef.current) {
      rebuildHeartModel(heartGroupRef.current, patient);
      if (particlesGroupRef.current) {
        setupBloodFlowParticles(particlesGroupRef.current, patient);
      }
    }
  }, [patient, showIschemiaMap]);

  // Update visibility of groups
  useEffect(() => {
    if (thoraxGroupRef.current) {
      thoraxGroupRef.current.visible = showThorax;
    }
    if (particlesGroupRef.current) {
      particlesGroupRef.current.visible = showFlow;
    }
  }, [showThorax, showFlow]);

  // Camera preset view transitions
  const setCameraView = (view: 'ap' | 'lao' | 'rao' | 'lateral' | 'posterior') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const controls = controlsRef.current;
    switch (view) {
      case 'ap': // Anterior Front
        cameraRef.current.position.set(0, 0.4, 5.0);
        break;
      case 'lao': // Left Anterior Oblique (45 deg left)
        cameraRef.current.position.set(-3.5, 0.6, 3.8);
        break;
      case 'rao': // Right Anterior Oblique (45 deg right)
        cameraRef.current.position.set(3.5, 0.6, 3.8);
        break;
      case 'lateral':
        cameraRef.current.position.set(-5.0, 0.3, 0);
        break;
      case 'posterior':
        cameraRef.current.position.set(0, 0.5, -5.2);
        break;
    }
    controls.target.set(0, 0, 0);
    controls.update();
  };

  /**
   * Reconstruct Heart Myocardium, Great Vessels, Coronary Arteries, and Stents
   */
  function rebuildHeartModel(group: THREE.Group, p: PatientProfile) {
    // Clear old children except particlesGroup
    const toRemove: THREE.Object3D[] = [];
    group.children.forEach((child) => {
      if (child !== particlesGroupRef.current) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((c) => group.remove(c));

    // A. MYOCARDIUM (Ventricular and Atrial Anatomy)
    // Custom sculpted Heart Base Geometry
    const heartGeo = new THREE.SphereGeometry(1.0, 48, 48);
    // Deform sphere into realistic anatomical cardiac apex and chambers
    const pos = heartGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Apex point towards left and inferiorly (cardiac axis)
      if (y < 0) {
        const factor = Math.abs(y);
        x -= factor * 0.35; // tilt apex to patient left
        z += factor * 0.15; // tilt forward
        const pinch = 1.0 - factor * 0.45;
        x *= pinch;
        z *= pinch;
      } else {
        // Base widening for atria & aortic outflow
        x *= 1.08;
        z *= 0.95;
      }
      pos.setXYZ(i, x, y, z);
    }
    heartGeo.computeVertexNormals();

    // Determine regional ischemia status for myocardial surface
    // LAD ischemia -> Anteroseptal/Apex; LCx -> Lateral; RCA -> Inferior
    const ladSten = p.coronaryVessels.lad.hasStent ? 0 : p.coronaryVessels.lad.stenosisPercent;
    const lcxSten = p.coronaryVessels.lcx.hasStent ? 0 : p.coronaryVessels.lcx.stenosisPercent;
    const rcaSten = p.coronaryVessels.rca.hasStent ? 0 : p.coronaryVessels.rca.stenosisPercent;

    const baseColor = new THREE.Color(0xb91c1c); // Healthy myocardium red
    let heartMat: THREE.Material;

    if (showIschemiaMap && (ladSten > 50 || lcxSten > 50 || rcaSten > 50)) {
      // Create dynamic canvas texture representing ischemic perfusion map
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      // Background healthy red
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(0, 0, 512, 512);

      // LAD territory (Apex & Anteroseptal: center bottom)
      if (ladSten > 50) {
        const severity = (ladSten - 50) / 50;
        const grad = ctx.createRadialGradient(256, 380, 20, 256, 380, 160);
        grad.addColorStop(0, severity > 0.6 ? '#4c1d95' : '#7c2d12'); // Ischemic dusky purple / ember
        grad.addColorStop(0.7, '#991b1b');
        grad.addColorStop(1, '#b91c1c');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(256, 380, 160, 0, Math.PI * 2);
        ctx.fill();
      }

      // LCx territory (Lateral LV: right side)
      if (lcxSten > 50) {
        const severity = (lcxSten - 50) / 50;
        const grad = ctx.createRadialGradient(420, 280, 20, 420, 280, 130);
        grad.addColorStop(0, severity > 0.6 ? '#581c87' : '#9a3412');
        grad.addColorStop(1, '#b91c1c');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(420, 280, 130, 0, Math.PI * 2);
        ctx.fill();
      }

      // RCA territory (Inferior & posterior: left & back)
      if (rcaSten > 50) {
        const severity = (rcaSten - 50) / 50;
        const grad = ctx.createRadialGradient(100, 320, 20, 100, 320, 140);
        grad.addColorStop(0, severity > 0.6 ? '#6b21a8' : '#c2410c');
        grad.addColorStop(1, '#b91c1c');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(100, 320, 140, 0, Math.PI * 2);
        ctx.fill();
      }

      const texture = new THREE.CanvasTexture(canvas);
      heartMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.45,
        metalness: 0.12,
      });
    } else {
      heartMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.45,
        metalness: 0.12,
      });
    }

    const myocardiumMesh = new THREE.Mesh(heartGeo, heartMat);
    myocardiumMeshRef.current = myocardiumMesh;
    group.add(myocardiumMesh);

    // B. GREAT VESSELS (Ascending Aorta, Arch, Pulmonary Trunk, Vena Cava)
    // 1. Ascending Aorta and Aortic Arch
    const aortaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.08, 0.65, 0.1),
      new THREE.Vector3(0.12, 1.35, 0.1),
      new THREE.Vector3(0.05, 1.7, -0.05),
      new THREE.Vector3(-0.35, 1.72, -0.25),
      new THREE.Vector3(-0.45, 1.25, -0.45),
    ]);
    const aortaGeo = new THREE.TubeGeometry(aortaCurve, 40, 0.22, 20, false);
    const aortaMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48, // Arterial bright crimson
      roughness: 0.35,
      metalness: 0.25,
    });
    const aortaMesh = new THREE.Mesh(aortaGeo, aortaMat);
    group.add(aortaMesh);

    // Arch branch vessels (Brachiocephalic, Carotid, Subclavian)
    const branch1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.45), aortaMat);
    branch1.position.set(0.15, 1.85, 0.0);
    group.add(branch1);

    const branch2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.42), aortaMat);
    branch2.position.set(-0.05, 1.9, -0.1);
    group.add(branch2);

    const branch3 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.38), aortaMat);
    branch3.position.set(-0.25, 1.88, -0.2);
    group.add(branch3);

    // 2. Pulmonary Trunk (Blue-purple venous blood to lungs)
    const pulmoCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.25, 0.55, 0.35),
      new THREE.Vector3(-0.28, 1.15, 0.25),
      new THREE.Vector3(-0.15, 1.45, -0.08),
    ]);
    const pulmoGeo = new THREE.TubeGeometry(pulmoCurve, 28, 0.19, 16, false);
    const pulmoMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.4,
      metalness: 0.2,
    });
    group.add(new THREE.Mesh(pulmoGeo, pulmoMat));

    // 3. Superior Vena Cava
    const svcCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.65, 0.5, -0.1),
      new THREE.Vector3(0.65, 1.45, -0.1),
    ]);
    const svcGeo = new THREE.TubeGeometry(svcCurve, 16, 0.16, 16, false);
    group.add(new THREE.Mesh(svcGeo, pulmoMat));

    // C. CORONARY ARTERY VASCULATURE TREE
    // Helper to get color and glow for a vessel based on stenosis and stent
    const getVesselMaterial = (v: VesselSegment) => {
      let color = 0xd97706; // Amber default
      if (v.hasStent) {
        color = 0x38bdf8; // Stented luminous cyan
      } else if (v.stenosisPercent >= 70) {
        color = 0xef4444; // Critical red
      } else if (v.stenosisPercent >= 50) {
        color = 0xf59e0b; // Moderate warning amber
      } else {
        color = 0x22c55e; // Normal green/patent
      }

      return new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: v.hasStent ? 0.6 : 0.2,
        emissive: v.hasStent ? 0x0284c7 : v.stenosisPercent >= 70 ? 0x991b1b : 0x000000,
        emissiveIntensity: v.hasStent ? 0.5 : v.stenosisPercent >= 70 ? 0.45 : 0.0,
      });
    };

    // 1. LEFT ANTERIOR DESCENDING (LAD) ARTERY & DIAGONAL BRANCHES
    const ladCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.02, 0.68, 0.72), // Origin from LMCA
      new THREE.Vector3(-0.06, 0.45, 0.88), // Proximal segment (critical lesion area)
      new THREE.Vector3(-0.16, 0.12, 0.98), // Mid segment
      new THREE.Vector3(-0.28, -0.32, 0.92), // Distal segment
      new THREE.Vector3(-0.38, -0.75, 0.76), // Apical wrap
      new THREE.Vector3(-0.35, -0.92, 0.55),
    ]);

    // Build tube with localized luminal narrowing at stenosis site
    const ladMat = getVesselMaterial(p.coronaryVessels.lad);
    const ladMesh = buildStenoticVesselMesh(
      ladCurve,
      0.055,
      p.coronaryVessels.lad.stenosisPercent,
      p.coronaryVessels.lad.hasStent,
      0.35, // Proximal lesion location along curve
      ladMat,
      p.coronaryVessels.lad
    );
    group.add(ladMesh);

    // Diagonal branch D1 off LAD
    const diagCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.16, 0.12, 0.98),
      new THREE.Vector3(-0.38, 0.02, 0.94),
      new THREE.Vector3(-0.58, -0.22, 0.82),
    ]);
    const diagGeo = new THREE.TubeGeometry(diagCurve, 20, 0.032, 10, false);
    group.add(new THREE.Mesh(diagGeo, ladMat));

    // 2. LEFT CIRCUMFLEX ARTERY (LCx) & OBTUSE MARGINALS
    const lcxCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.02, 0.68, 0.72), // Origin
      new THREE.Vector3(-0.35, 0.58, 0.68),
      new THREE.Vector3(-0.75, 0.45, 0.42), // Proximal/Mid LCx
      new THREE.Vector3(-0.95, 0.22, -0.05), // Obtuse margin
      new THREE.Vector3(-0.85, -0.15, -0.45), // Posterolateral LV
      new THREE.Vector3(-0.65, -0.45, -0.55),
    ]);
    const lcxMat = getVesselMaterial(p.coronaryVessels.lcx);
    const lcxMesh = buildStenoticVesselMesh(
      lcxCurve,
      0.052,
      p.coronaryVessels.lcx.stenosisPercent,
      p.coronaryVessels.lcx.hasStent,
      0.45, // mid lesion
      lcxMat,
      p.coronaryVessels.lcx
    );
    group.add(lcxMesh);

    // Obtuse Marginal 1 (OM1)
    const omCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.75, 0.45, 0.42),
      new THREE.Vector3(-0.88, 0.1, 0.35),
      new THREE.Vector3(-0.82, -0.3, 0.15),
    ]);
    const omGeo = new THREE.TubeGeometry(omCurve, 20, 0.03, 10, false);
    group.add(new THREE.Mesh(omGeo, lcxMat));

    // 3. RIGHT CORONARY ARTERY (RCA) & POSTERIOR DESCENDING (PDA)
    const rcaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.28, 0.65, 0.62), // Right coronary sinus ostium
      new THREE.Vector3(0.65, 0.45, 0.55), // Proximal RCA
      new THREE.Vector3(0.88, 0.15, 0.32), // Mid RCA in AV sulcus
      new THREE.Vector3(0.85, -0.35, 0.05), // Acute marginal area
      new THREE.Vector3(0.68, -0.65, -0.32), // Crux of heart
      new THREE.Vector3(0.35, -0.85, -0.42), // PDA descending
    ]);
    const rcaMat = getVesselMaterial(p.coronaryVessels.rca);
    const rcaMesh = buildStenoticVesselMesh(
      rcaCurve,
      0.055,
      p.coronaryVessels.rca.stenosisPercent,
      p.coronaryVessels.rca.hasStent,
      0.4,
      rcaMat,
      p.coronaryVessels.rca
    );
    group.add(rcaMesh);

    // D. PLAQUE & STENT VISUALIZERS AT LESION SITES
    addLesionPlaqueOrStent(group, ladCurve, 0.35, p.coronaryVessels.lad);
    addLesionPlaqueOrStent(group, lcxCurve, 0.45, p.coronaryVessels.lcx);
    addLesionPlaqueOrStent(group, rcaCurve, 0.4, p.coronaryVessels.rca);

    // E. 3D ANATOMICAL CALLOUT PINS
    addAnatomicalCalloutPin(group, ladCurve.getPointAt(0.35), 'LAD', p.coronaryVessels.lad);
    addAnatomicalCalloutPin(group, lcxCurve.getPointAt(0.45), 'LCx', p.coronaryVessels.lcx);
    addAnatomicalCalloutPin(group, rcaCurve.getPointAt(0.4), 'RCA', p.coronaryVessels.rca);
  }

  /**
   * Builds custom tube geometry with physical narrowing at the stenosis site
   */
  function buildStenoticVesselMesh(
    curve: THREE.CatmullRomCurve3,
    baseRadius: number,
    stenosisPercent: number,
    hasStent: boolean,
    lesionT: number,
    material: THREE.Material,
    segmentData: VesselSegment
  ): THREE.Mesh {
    const tubularSegments = 50;
    const radialSegments = 14;
    const frames = curve.computeFrenetFrames(tubularSegments, false);
    const geometry = new THREE.BufferGeometry();

    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    for (let i = 0; i <= tubularSegments; i++) {
      const u = i / tubularSegments;
      const point = curve.getPointAt(u);
      const N = frames.normals[i];
      const B = frames.binormals[i];

      // Calculate localized luminal constriction
      let r = baseRadius;
      if (!hasStent && stenosisPercent > 20) {
        const distFromLesion = Math.abs(u - lesionT);
        if (distFromLesion < 0.12) {
          const factor = Math.cos((distFromLesion / 0.12) * (Math.PI / 2));
          const narrowing = (stenosisPercent / 100) * 0.72; // maximum constriction
          r = baseRadius * (1.0 - factor * narrowing);
        }
      }

      for (let j = 0; j <= radialSegments; j++) {
        const v = j / radialSegments;
        const theta = v * Math.PI * 2;
        const sin = Math.sin(theta);
        const cos = -Math.cos(theta);

        const normal = new THREE.Vector3()
          .copy(N)
          .multiplyScalar(cos)
          .add(new THREE.Vector3().copy(B).multiplyScalar(sin));

        const vertex = new THREE.Vector3().copy(point).add(normal.clone().multiplyScalar(r));

        vertices.push(vertex.x, vertex.y, vertex.z);
        uvs.push(u, v);
      }
    }

    for (let i = 0; i < tubularSegments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * (radialSegments + 1) + j;
        const b = (i + 1) * (radialSegments + 1) + j;
        const c = (i + 1) * (radialSegments + 1) + (j + 1);
        const d = i * (radialSegments + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = {
      isVessel: true,
      name: segmentData.name,
      acronym: segmentData.acronym,
      vesselSegment: segmentData,
    };
    return mesh;
  }

  /**
   * Adds plaque lesion indicator or metallic stent mesh
   */
  function addLesionPlaqueOrStent(
    group: THREE.Group,
    curve: THREE.CatmullRomCurve3,
    lesionT: number,
    vessel: VesselSegment
  ) {
    const pt = curve.getPointAt(lesionT);
    const tangent = curve.getTangentAt(lesionT).normalize();

    if (vessel.hasStent) {
      // 3D Metallic Stent Lattice
      const stentGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.24, 16, 6, true);
      const stentMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        wireframe: true,
        roughness: 0.2,
        metalness: 0.9,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
      });
      const stentMesh = new THREE.Mesh(stentGeo, stentMat);
      stentMesh.position.copy(pt);
      stentMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      stentMesh.userData = {
        isVessel: true,
        name: `${vessel.name} (Drug-Eluting Stent Deployed)`,
        vesselSegment: vessel,
      };
      group.add(stentMesh);
    } else if (vessel.stenosisPercent >= 50) {
      // Plaque nodule (Yellowish fatty or white calcified)
      const plaqueColor =
        vessel.plaqueType === 'calcified'
          ? 0xfef08a // Calcium white-gold
          : vessel.plaqueType === 'necrotic_core_vulnerable'
          ? 0xf97316 // Unstable orange-red necrotic core
          : 0xeab308; // Fibrolipid yellow

      const plaqueGeo = new THREE.SphereGeometry(0.06 + (vessel.stenosisPercent / 100) * 0.04, 12, 12);
      const plaqueMat = new THREE.MeshStandardMaterial({
        color: plaqueColor,
        roughness: 0.6,
        metalness: 0.1,
      });
      const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
      plaqueMesh.position.copy(pt);
      plaqueMesh.userData = {
        isVessel: true,
        name: `${vessel.name} (${vessel.stenosisPercent}% Lesion)`,
        vesselSegment: vessel,
      };
      group.add(plaqueMesh);
    }
  }

  /**
   * Adds an interactive 3D pin badge pointing to the vessel
   */
  function addAnatomicalCalloutPin(
    group: THREE.Group,
    pos: THREE.Vector3,
    label: string,
    vessel: VesselSegment
  ) {
    const pinGroup = new THREE.Group();
    pinGroup.position.copy(pos);

    // Little sphere anchor
    const sphereGeo = new THREE.SphereGeometry(0.035, 12, 12);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: vessel.hasStent ? 0x38bdf8 : vessel.stenosisPercent >= 70 ? 0xef4444 : 0x10b981,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    pinGroup.add(sphere);

    // Stem line extending out
    const normalOffset = pos.clone().normalize().multiplyScalar(0.22);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      normalOffset,
    ]);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.6,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    pinGroup.add(line);

    pinGroup.userData = {
      isVessel: true,
      name: `${vessel.name} (${vessel.stenosisPercent}% Stenosis)`,
      vesselSegment: vessel,
    };

    group.add(pinGroup);
  }

  /**
   * Setup animated particles flowing along coronary arteries
   */
  function setupBloodFlowParticles(group: THREE.Group, p: PatientProfile) {
    // Clear old particles
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const ladCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.02, 0.68, 0.72),
      new THREE.Vector3(-0.06, 0.45, 0.88),
      new THREE.Vector3(-0.16, 0.12, 0.98),
      new THREE.Vector3(-0.28, -0.32, 0.92),
      new THREE.Vector3(-0.38, -0.75, 0.76),
    ]);

    const lcxCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.02, 0.68, 0.72),
      new THREE.Vector3(-0.35, 0.58, 0.68),
      new THREE.Vector3(-0.75, 0.45, 0.42),
      new THREE.Vector3(-0.95, 0.22, -0.05),
      new THREE.Vector3(-0.65, -0.45, -0.55),
    ]);

    const rcaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.28, 0.65, 0.62),
      new THREE.Vector3(0.65, 0.45, 0.55),
      new THREE.Vector3(0.88, 0.15, 0.32),
      new THREE.Vector3(0.85, -0.35, 0.05),
      new THREE.Vector3(0.35, -0.85, -0.42),
    ]);

    const particleGeo = new THREE.SphereGeometry(0.016, 8, 8);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xff4d4d });

    const createStream = (curve: THREE.CatmullRomCurve3, count: number, sten: number, stented: boolean) => {
      // Flow speed reduces when stenosis is severe unless stented
      const effectiveFlow = stented ? 1.0 : Math.max(0.2, 1.0 - sten / 100);
      const speed = 0.005 * effectiveFlow;

      for (let i = 0; i < count; i++) {
        const particle = new THREE.Mesh(particleGeo, particleMat);
        const progress = i / count;
        particle.userData = {
          curve,
          progress,
          speed,
        };
        particle.position.copy(curve.getPointAt(progress));
        group.add(particle);
      }
    };

    createStream(
      ladCurve,
      16,
      p.coronaryVessels.lad.stenosisPercent,
      p.coronaryVessels.lad.hasStent
    );
    createStream(
      lcxCurve,
      14,
      p.coronaryVessels.lcx.stenosisPercent,
      p.coronaryVessels.lcx.hasStent
    );
    createStream(
      rcaCurve,
      14,
      p.coronaryVessels.rca.stenosisPercent,
      p.coronaryVessels.rca.hasStent
    );
  }

  return (
    <div className="relative w-full h-full min-h-[520px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
      {/* 3D Viewport Toolbar Header */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-lg text-xs text-slate-200">
          <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
          <span className="font-semibold tracking-wide">3D CARDIAC ANATOMY</span>
          <span className="text-slate-500">|</span>
          <span className="font-mono text-emerald-400">{heartRate} BPM</span>
        </div>

        {/* Camera Orientation Presets */}
        <div className="flex items-center gap-1 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-700/60 shadow-lg">
          <button
            onClick={() => setCameraView('ap')}
            className="px-2.5 py-1 text-xs font-medium rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Anterior (Front)"
          >
            AP
          </button>
          <button
            onClick={() => setCameraView('lao')}
            className="px-2.5 py-1 text-xs font-medium rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Left Anterior Oblique (Cath Lab)"
          >
            LAO
          </button>
          <button
            onClick={() => setCameraView('rao')}
            className="px-2.5 py-1 text-xs font-medium rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Right Anterior Oblique"
          >
            RAO
          </button>
          <button
            onClick={() => setCameraView('lateral')}
            className="px-2.5 py-1 text-xs font-medium rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Left Lateral"
          >
            Lateral
          </button>
          <button
            onClick={() => setCameraView('posterior')}
            className="px-2.5 py-1 text-xs font-medium rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Posterior (Back)"
          >
            Post
          </button>
        </div>
      </div>

      {/* Hover vessel banner */}
      {hoveredVesselName && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 pointer-events-none bg-slate-900/95 backdrop-blur-md px-4 py-1.5 rounded-full border border-sky-500/50 shadow-xl text-xs font-medium text-sky-300 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Click to inspect & revascularize: <strong className="text-white">{hoveredVesselName}</strong></span>
        </div>
      )}

      {/* Main Three.js Canvas Container */}
      <div ref={mountRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Layer Toggles & Cardiac Controls Footer Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-1 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/60 shadow-lg text-xs">
          {/* Thorax Toggle */}
          <button
            onClick={() => setShowThorax(!showThorax)}
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
              showThorax ? 'bg-slate-800 text-sky-400 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Rib Cage</span>
          </button>

          {/* Blood Flow Particles Toggle */}
          <button
            onClick={() => setShowFlow(!showFlow)}
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
              showFlow ? 'bg-slate-800 text-rose-400 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Hemodynamics Flow</span>
          </button>

          {/* Ischemia Heatmap Toggle */}
          <button
            onClick={() => setShowIschemiaMap(!showIschemiaMap)}
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
              showIschemiaMap ? 'bg-slate-800 text-amber-400 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ischemia Heatmap</span>
          </button>
        </div>

        {/* Heartbeat rate and sound controls */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-lg text-xs text-slate-300">
          <button
            onClick={() => setIsBeating(!isBeating)}
            className="hover:text-white transition-colors"
            title={isBeating ? 'Pause Cardiac Cycle' : 'Resume Beat'}
          >
            {isBeating ? 'Pause Beat' : 'Resume Beat'}
          </button>

          <span className="text-slate-600">|</span>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1 rounded transition-colors ${
              soundEnabled ? 'text-rose-400 bg-rose-500/10' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Synthesized Stethoscope Audio"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Legend & Guide Drawer */}
      <div className="absolute right-3 top-14 z-10 pointer-events-none hidden md:flex flex-col gap-1 text-[11px] text-slate-400 bg-slate-900/80 backdrop-blur p-2.5 rounded-lg border border-slate-800">
        <span className="font-semibold text-slate-300 mb-0.5">Vascular Perfusion Status</span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span>Patent (&lt;50% Stenosis)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          <span>Moderate (50-69%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
          <span>Severe (&ge;70% Ischemic)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
          <span>Stented (DES Patent)</span>
        </div>
        <div className="flex items-center gap-2 mt-1 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
          <span>Rotate: Drag · Zoom: Scroll · Pan: Right-click</span>
        </div>
      </div>
    </div>
  );
};
