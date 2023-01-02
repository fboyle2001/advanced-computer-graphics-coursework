To open the environment, go into the 'code' folder and run the command 'npm install' once this is complete run the command 'npm run main'.
Once this has loaded, go to http://localhost:8080 and the environment should be loaded!
I have created and tested this coursework on a Windows 10 64-bit computer.

Included files:
- report.pdf - Contains information about how this meets the criteria
- video.mp4 - 1 minute video showcasing notable features
- readme.txt - This file; contains credit for external assets
- code (folder) - Contains the TypeScript code and all resources (textures and models) for the Three.js environment
- helpers (folder) - Contains Python code for Progressive Mesh generation and Parametric Curves and Surface experimentation

Credit:
Source Code
- Material referenced for details about mathematical concepts are in the source code comments (e.g. how to define B-Spline Basis Functions recursively)
- This section here covers code that I have copied and pasted and take absolutely no credit for
code/src/utils/binomial_coeff.ts - Implements binomial coefficient calculation in TypeScript, full credit to Mike 'Pomax' Kamermans (https://stackoverflow.com/a/37716142)
code/src/utils/model_store.ts:L728->738 - The control points and knots vectors are from the paper at https://www.geometrictools.com/Documentation/NURBSCircleSphere.pdf (Sec 3.3, Table 3)
(The NURBS surface implementation is custom though, just the control points to define a sphere are provided by the paper!)
code/src/utils/three_setup.ts - Some of this code is boilerplate from the official documentation on how to setup up Three.js https://threejs.org/docs

Textures
textures/classroom_roof.jpg - Edward Xu https://pin.it/7p95Mdt 
textures/dirt.jpg - FabooGuy https://www.deviantart.com/fabooguy/art/Dirt-Ground-Texture-Tileable-2048x2048-441212191
textures/grass.jpg - All3DFree https://www.all3dfree.net/grass-textures.html
textures/gravel.jpg - Architextures https://architextures.org/textures/587 (Licensed under CC 4.0)
textures/skybox.jpg - Render Knight https://assetstore.unity.com/packages/2d/textures-materials/sky/fantasy-skybox-free-18353 (Licensed under Standard Unity Asset Store EULA)
textures/trampoline.jpg - Caccaro https://www.caccaro.com/en/cabina-module 
textures/tree_billboard.jpg 
textures/uv_grid_opengl.jpg - https://threejs.org/examples/textures/uv_grid_opengl.jpg (Licensed under The MIT License, Copyright 2022 Three.js)
textures/water.jpg - Better Your Life https://www.vecteezy.com/vector-art/1844212-water-texture-top-view-background-vector-design-illustration 
textures/wooden_shed.jpg - Doberman84 https://www.dreamstime.com/old-wooden-shed-boards-peeling-paint-vertical-direction-boards-texture-blue-tones-old-wooden-shed-boards-image169986567
Other textures are custom made

Models
models/external/low_poly_car - Urmanga https://sketchfab.com/3d-models/low-poly-rigged-zaz-965-ad9238431ba7499c9cd34ea59d8c6381 (Licensed under CC-BY-4.0)
models/external/rigged_pine - fafi622 https://sketchfab.com/3d-models/rigged-pine-tree001-eec38303069a431597dc12a9a9975fd3 (Licensed under CC-BY-4.0)
All models in models/custom/* are custom made using SketchUp and Blender
All models (where possible) are packed using gltfpack (https://github.com/zeux/meshoptimizer and https://meshoptimizer.org/gltf/)