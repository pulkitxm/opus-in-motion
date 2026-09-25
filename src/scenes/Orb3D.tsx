import { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { noise3D } from "@remotion/noise";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { C } from "../theme";
import { WIDTH, HEIGHT } from "../timeline";
import { ease, hash, lerp, progress, pulse, useBeat } from "../lib/motion";

const SPHERE = 1.53;
const RINGS = 12;
const PER_RING = 60;
const COUNT = RINGS * PER_RING;
const TUNNEL_RADIUS = 2.3;
const PALETTE = [C.orange, C.orange, C.bone, C.bone, C.blue, C.pink, C.lime];

const Environment = () => {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = texture;
    return () => {
      scene.environment = null;
      texture.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
};

const CameraRig = () => {
  const b = useBeat();
  const { camera } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const orbit = progress(b, 16, 18);
    const back = ease.inOutCubic(progress(b, 18, 19.1));
    const fly = ease.inCubic(progress(b, 19.1, 20));
    const x = Math.sin(orbit * 1.4) * 1.6 * (1 - back);
    const y = Math.sin(orbit * 2.1) * 0.5 * (1 - back);
    const z = lerp(lerp(10, 9, orbit), 11.5, back);
    cam.position.set(x, y, lerp(z, -18, fly));
    cam.fov = lerp(35, 78, ease.inQuad(progress(b, 19.1, 20)));
    const roll = (Math.PI / 2) * fly;
    cam.up.set(Math.sin(roll), Math.cos(roll), 0);
    cam.lookAt(0, 0, lerp(0, cam.position.z - 12, ease.inOutCubic(progress(b, 19, 19.5))));
    cam.updateProjectionMatrix();
  }, [b, camera]);
  return null;
};

const Blob = () => {
  const b = useBeat();
  const ref = useRef<THREE.Mesh>(null);
  const { geometry, base } = useMemo(() => {
    let g: THREE.BufferGeometry = new THREE.SphereGeometry(SPHERE, 200, 140);
    g.deleteAttribute("normal");
    g.deleteAttribute("uv");
    g = mergeVertices(g);
    return { geometry: g, base: (g.attributes.position.array as Float32Array).slice() };
  }, []);

  useLayoutEffect(() => {
    const t = b - 16;
    const amp = 0.22 * ease.outExpo(progress(b, 16, 16.45)) + 0.16 * pulse(b, 17, 0.3) + 0.35 * ease.inCubic(progress(b, 17.4, 18));
    const ripple = 0.07 * (pulse(b, 16, 0.3) * progress(b, 16, 16.08) + pulse(b, 17, 0.3));
    const pos = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < pos.length; i += 3) {
      const x = base[i] / SPHERE;
      const y = base[i + 1] / SPHERE;
      const z = base[i + 2] / SPHERE;
      const n = noise3D("blob", x * 1.1 + t * 0.7, y * 1.1 - t * 0.2, z * 1.1 + t * 0.4);
      const wave = Math.sin(y * 7 - t * 10) * ripple;
      const k = 1 + (n * amp + wave) / SPHERE;
      pos[i] = base[i] * k;
      pos[i + 1] = base[i + 1] * k;
      pos[i + 2] = base[i + 2] * k;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    if (ref.current) {
      ref.current.rotation.set(0.3 + t * 0.2, t * 0.9, 0);
      ref.current.scale.setScalar(1 + 0.05 * pulse(b, 16, 0.25));
    }
  }, [b, base, geometry]);

  return (
    <mesh ref={ref} geometry={geometry} visible={b < 18}>
      <meshPhysicalMaterial
        color={C.orange}
        roughness={0.16}
        metalness={0.05}
        clearcoat={1}
        clearcoatRoughness={0.08}
        iridescence={1}
        iridescenceIOR={1.35}
        iridescenceThicknessRange={[120, 780]}
      />
    </mesh>
  );
};

const CUBES = (() => {
  const points = Array.from({ length: COUNT }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / COUNT;
    const r = Math.sqrt(1 - y * y);
    const a = i * Math.PI * (3 - Math.sqrt(5));
    return new THREE.Vector3(Math.cos(a) * r * SPHERE, y * SPHERE, Math.sin(a) * r * SPHERE);
  });
  const byDepth = points.map((p, i) => ({ p, i })).sort((a, b) => b.p.z - a.p.z);
  const cubes: { start: THREE.Vector3; ring: number; slot: number; axis: THREE.Vector3; seed: number; color: string }[] = [];
  for (let ring = 0; ring < RINGS; ring++) {
    byDepth
      .slice(ring * PER_RING, (ring + 1) * PER_RING)
      .sort((a, b) => Math.atan2(a.p.y, a.p.x) - Math.atan2(b.p.y, b.p.x))
      .forEach(({ p, i }, slot) => {
        cubes.push({
          start: p,
          ring,
          slot,
          seed: hash(i),
          axis: new THREE.Vector3(hash(i + 1) - 0.5, hash(i + 2) - 0.5, hash(i + 3) - 0.5).normalize(),
          color: PALETTE[Math.floor(hash(i + 4) * PALETTE.length)],
        });
      });
  }
  return cubes;
})();

const Shards = () => {
  const b = useBeat();
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(0.19, 0.19, 0.19), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const burstQ = new THREE.Quaternion();
    const targetQ = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const color = new THREE.Color();
    const burst = ease.outExpo(progress(b, 18, 18.75));
    const blobSpin = (18 - 16) * 0.9;

    CUBES.forEach((cube, i) => {
      const start = cube.start.clone().applyEuler(new THREE.Euler(0.3 + 0.4, blobSpin, 0));
      const exploded = start.clone().multiplyScalar(1 + 2.1 * burst + cube.seed * 0.8 * burst);
      exploded.y += Math.sin(cube.seed * 20) * 0.4 * burst;
      burstQ.setFromAxisAngle(cube.axis, (6 + cube.seed * 4) * burst + (b - 18) * 1.5);

      const spin = (cube.ring % 2 === 0 ? 1 : -1) * 0.7 * Math.max(0, b - 18.4);
      const theta = (cube.slot / PER_RING) * Math.PI * 2 + cube.ring * 0.26 + spin;
      const z = 1 - cube.ring * 1.45;
      const radius = TUNNEL_RADIUS * (1 + 0.06 * pulse(b, 19, 0.25));
      euler.set(0, 0, theta);
      targetQ.setFromEuler(euler);

      const delay = cube.ring * 0.035 + cube.seed * 0.12;
      const t = ease.inOutCubic(progress(b, 18.42 + delay, 19.2 + delay));
      position.set(
        lerp(exploded.x, Math.cos(theta) * radius, t),
        lerp(exploded.y, Math.sin(theta) * radius, t),
        lerp(exploded.z, z, t),
      );
      const q = burstQ.clone().slerp(targetQ, t);
      const s = b < 18 ? 0 : 1 + 0.35 * Math.sin(Math.PI * t);
      scale.set(s, s, s * lerp(1, 2.4, t));
      matrix.compose(position, q, scale);
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, color.set(cube.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [b]);

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, COUNT]} frustumCulled={false}>
      <meshStandardMaterial roughness={0.28} metalness={0.15} />
    </instancedMesh>
  );
};

export const Orb3D = () => {
  const b = useBeat();
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <ThreeCanvas flat width={WIDTH} height={HEIGHT} camera={{ fov: 35, position: [0, 0, 10], near: 0.05, far: 100 }}>
        <color attach="background" args={[C.ink]} />
        <fog attach="fog" args={[C.ink, 12, 30]} />
        <Environment />
        <CameraRig />
        <ambientLight intensity={0.25} />
        <directionalLight position={[4, 5, 6]} intensity={2.2} color={C.bone} />
        <pointLight position={[-4, -2, 3]} intensity={30} color={C.orange} />
        <pointLight position={[4, 3, -2]} intensity={40} color={C.blue} />
        <Blob />
        <Shards />
      </ThreeCanvas>
      <AbsoluteFill style={{ backgroundColor: C.bone, opacity: Math.pow(progress(b, 19.7, 20), 3) }} />
    </AbsoluteFill>
  );
};
