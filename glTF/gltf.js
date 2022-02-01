import Mat4 from "./mat4.js"

export default class Gltf {
  static INT8 = 0x1400;
  static UINT8 = 0x1401;
  static INT16 = 0x1402;
  static UINT16 = 0x1403;
  static INT32 = 0x1404;
  static UINT32 = 0x1405;
  static FLOAT32 = 0x1406;

  constructor(renderer, file) {
    if (!/\.(?:glb|gltf)/.test(file))
      console.error("Invalid file type");
    this.renderer = renderer;
    this.path = /(?:[^]*?\/)?(?=[^/]*$)/.exec(file)[0];
    this.file = /[^/]*\.[^]+$/.exec(file)[0];
  }

  async initializeFetch() {
    await this.fetchJson();
    await this.fetchBuffers();
    await this.fetchImages();
  }

  initializeData() {
    const {
      json
    } = this;
    this.meshes = new Array(json.meshes ?.length).fill().map(i => ({}));
    this.skins = new Array(json.skins ?.length).fill().map(i => ({}));
    this.nodes = new Array(json.nodes ?.length).fill().map(i => ({}));
  }

  async initializeAll() {
    await this.initializeFetch();
    this.initializeData();
  }

  async fetchJson() {
    this.json = await fetch(this.path + this.file).then(response => {
      if (response.ok)
        return response.json();
      else {
        console.error("Failed to fetch json.");
        console.error("Path: " + this.path + this.file);
      }
    });
  }

  async fetchBuffers() {
    const {
      path,
      json = await this.fetchJson()
    } = this;
    const {
      buffers: jsonBuffers
    } = json;
    const fetchedBuffers = [];
    if (jsonBuffers != undefined) {
      for (const buffer of jsonBuffers)
        fetchedBuffers.push(await fetch(path + buffer.uri).then(response => {
          if (response.ok)
            return response.arrayBuffer();
          else {
            console.error("Failed to fetch buffer.");
            console.error("Path: " + path + buffer.uri);
          }
        }));
    }
    this.buffers = fetchedBuffers;
  }

  async fetchImages() {
    const {
      path,
      json = await this.fetchJson(),
      bufferViews = this.buildBufferViews()
    } = this;
    const {
      images: jsonImages
    } = json;
    const fetchedImages = [];
    if (jsonImages != undefined) {
      const objectUrls = [];
      for (const image of jsonImages) {
        const {
          uri
        } = image;
        const fetchedImage = new Image();
        if (uri != undefined)
          fetchedImage.src = path + uri;
        else
          objectUrls.push(fetchedImage.src = URL.createObjectURL(
            new Blob([
              new DataView(bufferViews[image.bufferView])
            ], image.mimeType)));
        fetchedImage.onerror = function (error) {
          console.error("Failed to fetch image.");
          console.error("Error: " + error);
        };
        await new Promise(resolve => fetchedImage.onload = resolve);
        fetchedImages.push(fetchedImage);
      }
      for (const objectUrl of objectUrls)
        URL.revokeObjectURL(objectUrl);
    }
    this.images = fetchedImages;
  }

  buildBufferViews() {
    const {
      json,
      buffers
    } = this;
    const {
      bufferViews
    } = json;
    if (bufferViews != undefined) {
      this.bufferViews = bufferViews.map(bufferView => {
        const {
          byteOffset = 0,
          byteStride = 0,
          byteLength,
          buffer
        } = bufferView;
        const slice = buffers[buffer].slice(
          byteOffset,
          byteOffset + byteLength);
        return {
          byteStride,
          buffer: slice
        };
      });
    }
  }

  buildAccessors() {
    const {
      json,
      bufferViews = this.buildBufferViews()
    } = this;
    const {
      accessors
    } = json;
    if (accessors != undefined) {
      this.accessors = json.accessors.map(accessor => {
        const {
          byteOffset = 0,
          bufferView,
          componentType,
          type: dataType,
          sparse,
          count,
          min,
          max
        } = accessor;
        const {
          byteStride,
          buffer
        } = bufferViews[bufferView];
        let dataTypeSize;
        switch (dataType) {
          case "SCALAR":
            dataTypeSize = 1;
            break;
          case "VEC2":
            dataTypeSize = 2;
            break;
          case "VEC3":
            dataTypeSize = 3;
            break;
          case "VEC4":
          case "MAT2":
            dataTypeSize = 4;
            break;
          case "MAT3":
            dataTypeSize = 9;
            break;
          case "MAT4":
            dataTypeSize = 16;
            break;
          default:
            console.error("Invalid accessor data type.");
            console.error("Data type: " + dataType)
            break;
        }
        let arrayBufferViewType;
        let componentSize;
        let componentStride = byteStride;
        switch (componentType) {
          case Gltf.INT8:
            arrayBufferViewType = Int8Array;
            componentSize = 1;
            break;
          case Gltf.UINT8:
            arrayBufferViewType = Uint8Array;
            componentSize = 1;
            break;
          case Gltf.INT16:
            arrayBufferViewType = Int16Array;
            componentSize = 2;
            componentStride >>>= 1;
            break;
          case Gltf.UINT16:
            arrayBufferViewType = Uint16Array;
            componentSize = 2;
            componentStride >>>= 1;
            break;
          case Gltf.INT32:
            arrayBufferViewType = Int32Array;
            componentSize = 4;
            componentStride >>>= 2;
            break;
          case Gltf.UINT32:
            arrayBufferViewType = Uint32Array;
            componentSize = 4;
            componentStride >>>= 2;
            break;
          case Gltf.FLOAT32:
            arrayBufferViewType = Float32Array;
            componentSize = 4;
            componentStride >>>= 2;
            break;
          default:
            console.error("Invalid component type.");
            console.error("Component type: " + componentType);
            break;
        }
        componentStride ||= dataTypeSize;
        const length = (count - 1) * componentStride + dataTypeSize;
        const arrayBufferView = new arrayBufferViewType(
          buffer,
          byteOffset,
          length);
        if (sparse != undefined) {
          const {
            indices,
            values,
            count
          } = sparse;
          const {
            byteOffset: indicesByteOffset = 0,
            bufferView: indicesBufferView,
            componentType: indicesComponentType
          } = indices;
          const {
            byteOffset: valuesByteOffset = 0,
            bufferView: valuesBufferView
          } = values;
          let indicesArrayBufferViewType;
          switch (indicesComponentType) {
            case Gltf.INT8:
              indicesArrayBufferViewType = Int8Array;
              break;
            case Gltf.UINT8:
              indicesArrayBufferViewType = Uint8Array;
              break;
            case Gltf.INT16:
              indicesArrayBufferViewType = Int16Array;
              break;
            case Gltf.UINT16:
              indicesArrayBufferViewType = Uint16Array;
              break;
            case Gltf.INT32:
              indicesArrayBufferViewType = Int32Array;
              break;
            case Gltf.UINT32:
              indicesArrayBufferViewType = Uint32Array;
              break;
            case Gltf.FLOAT32:
              indicesArrayBufferViewType = Float32Array;
              break;
            default:
              console.error("Invalid indices component type.");
              console.error("Component type: " + indicesComponentType);
              break;
          }
          const indicesArrayBufferView = new indicesArrayBufferViewType(
            bufferViews[indicesBufferView].buffer,
            indicesByteOffset,
            count);
          const valuesArrayBufferView = new arrayBufferViewType(
            bufferViews[indicesBufferView].buffer,
            valuesByteOffset,
            count * dataTypeSize);
          let valueIndex = 0;
          for (let i = 0; i < count; i++) {
            arrayBufferView.set(
              valuesArray.slice(valueIndex, valueIndex += dataTypeSize),
              indicesArray[i] * dataTypeSize);
          }
        }
        return {
          stride: byteStride,
          type: componentType,
          size: dataTypeSize,
          count,
          array: arrayBufferView
        };
      });
    }
  }

  buildTextures() {
    const {
      json,
      renderer,
      images
    } = this;
    const {
      textures,
      samplers
    } = json;
    if (textures != undefined) {
      this.textures = textures.map(texture => {
        const {
          source: imageIndex,
          sampler: samplerIndex
        } = texture;
        const info = {
          image: images[imageIndex]
        };
        if (samplerIndex != undefined) {
          const sampler = samplers[samplerIndex];
          info.minFilter = sampler.minFilter;
          info.magFilter = sampler.magFilter;
          info.wrapS = sampler.wrapS;
          info.wrapT = sampler.wrapT;
        }
        return renderer.buildImageTexture(info);
      });
    } else
      this.textures = [];
  }

  buildScenes() {
    const {
      json,
      nodes: thisNodes
    } = this;
    const {
      scenes: jsonScenes
    } = json;
    if (jsonScenes != undefined) {
      const scenes = jsonScenes.map(scene => {
        const nodes = scene.nodes.map(node => thisNodes[node]);
        return {
          nodes
        };
      });
      this.scenes = scenes;
      this.defaultScene = scenes[json.scene ?? 0];
    } else
      this.scenes = [];
  }

  buildCameras() {
    const {
      json,
      renderer
    } = this;
    const {
      cameras
    } = json;
    if (cameras != undefined) {
      this.cameras = cameras.map(camera => {
        const {
          type
        } = camera;
        switch (type) {
          case "perspective":
            renderer.buildPerspectiveCamera({
              aspect: camera.aspectRatio,
              fov: camera.yfov,
              far: camera.zfar,
              near: camera.znear
            });
            break;
          case "orthographic":
            renderer.buildOrthographicCamera({
              aspect: camera.aspectRatio,
              zoomX: camera.xmag,
              zoomY: camera.ymag,
              far: camera.zfar,
              near: camera.znear
            });
            break;
          default:
            console.error("Invalid camera type");
            console.error("Camera type: " + type);
        }
      });
    } else
      this.cameras = [];
  }

  buildMeshes() {
    const {
      renderer,
      json,
      accessors = this.buildAccessors(),
      meshes: thisMeshes
    } = this;
    const {
      meshes: jsonMeshes
    } = json;
    if (jsonMeshes != undefined) {
      const {
        length: meshesLength
      } = jsonMeshes;
      for (let meshIndex = meshesLength; meshIndex--;) {
        const jsonMesh = jsonMeshes[meshIndex];
        const thisMesh = thisMeshes[meshIndex];
        const {
          primitives,
          weights
        } = jsonMesh;
        thisMesh.primitives = primitives.map(primitive => {
          const {
            mode,
            attributes,
            indices,
            material
          } = primitive;
          const meshAttributes = {};
          for (const attribute in attributes) {
            let attributeKey;
            switch (attribute) {
              case "POSITION":
                attributeKey = "a_position";
                break;
              case "TANGENT":
                attributeKey = "a_tangent";
                break;
              case "NORMAL":
                attributeKey = "a_normal";
                break;
              case "TEXCOORD_0":
                attributeKey = "a_texcoord_0";
                break;
              case "TEXCOORD_1":
                attributeKey = "a_texcoord_1";
                break;
              case "JOINTS_0":
                attributeKey = "a_joint_0";
                break;
              case "JOINTS_1":
                attributeKey = "a_joint_1";
                break;
              case "WEIGHTS_0":
                attributeKey = "a_weight_0";
                break;
              case "WEIGHTS_1":
                attributeKey = "a_weight_1";
                break;
              default:
                console.error("Unknown attribute name.");
                console.error("Attribute name: " + attribute);
                attributeKey = attribute;
                break;
            }
            const attributeIndex = attributes[attribute];
            meshAttributes[attributeKey] = accessors[attributeIndex];
          }
          const meshIndices = accessors[indices];
          const mesh = renderer.buildIndexedMesh({
            mode,
            indices: meshIndices,
            attributes: meshAttributes
          });
          return mesh;
        });
      }
    } else
      this.meshes = [];
  }

  buildSkins() {
    const {
      json,
      accessors = this.buildAccessors(),
      skins: thisSkins,
      nodes: thisNodes
    } = this;
    const {
      skins: jsonSkins
    } = json;
    if (jsonSkins != undefined) {
      const {
        length: skinsLength
      } = jsonSkins;
      for (let skinIndex = skinsLength; skinIndex--;) {
        const jsonSkin = jsonSkins[skinIndex];
        const thisSkin = thisSkins[skinIndex];
        const {
          array: inverseBindMatrices
        } = accessors[jsonSkin.inverseBindMatrices];
        let matrixIndex = 0;
        thisSkin.joints = jsonSkin.joints.map(jointIndex => {
          const inverseBindMatrix = inverseBindMatrices.slice(
            matrixIndex,
            matrixIndex += 16);
          return {
            inverseBindMatrix,
            node: thisNodes[jointIndex]
          };
        });
      }
    } else
      this.skins = [];
  }

  buildNodes() {
    const {
      json,
      accessors = this.buildAccessors(),
      meshes: thisMeshes,
      skins: thisSkins,
      nodes: thisNodes
    } = this;
    const {
      nodes: jsonNodes
    } = json;
    if (jsonNodes != undefined) {
      const {
        length: nodesLength
      } = jsonNodes;
      for (let nodeIndex = nodesLength; nodeIndex--;) {
        const jsonNode = jsonNodes[nodeIndex];
        const thisNode = thisNodes[nodeIndex];
        const {
          mesh: meshIndex,
          children
        } = jsonNode;
        if (meshIndex != undefined) {
          const {
            skin: skinIndex
          } = jsonNode;
          if (skinIndex != undefined)
            thisNode.skin = thisSkins[skinIndex];
          thisNode.mesh = thisMeshes[meshIndex];
        }
        if (children != undefined)
          thisNode.children = children.map(childIndex => {
            return thisNodes[childIndex];
          });
        thisNode.matrix = jsonNode.matrix;
        thisNode.translation = jsonNode.translation;
        thisNode.rotation = jsonNode.rotation;
        thisNode.scale = jsonNode.scale;
      }
    } else
      this.nodes = [];
  }

  buildAnimations() {
    const {
      json,
      accessors = this.buildAccessors(),
      nodes: thisNodes
    } = this;
    const {
      animations
    } = json;
    if (animations != undefined) {
      this.animations = animations.map(animation => {
        const {
          channels,
          samplers
        } = animation;
        const samplerFunctions = samplers.map(sampler => {
          const {
            input,
            output,
            interpolation
          } = sampler;
          const {
            array: inputArray,
            count
          } = accessors[input];
          const {
            array: outputArray,
            size: outputSize
          } = accessors[output];
          let samplerFunction;
          let lastInputIndex = 0;
          let lastTime = inputArray[lastInputIndex];
          switch (interpolation) {
            case "LINEAR":
              samplerFunction = function (time) {
                let nextInputIndex = (lastInputIndex + 1) % count;
                let nextTime = inputArray[nextInputIndex];
                let checks = 0;
                while (nextTime < time && checks++ < count) {
                  lastInputIndex = nextInputIndex;
                  nextInputIndex = (nextInputIndex + 1) % count;
                  lastTime = nextTime;
                  nextTime = inputArray[nextInputIndex];
                }
                while (lastTime > time && checks++ < count) {
                  nextInputIndex = lastInputIndex;
                  lastInputIndex = (lastInputIndex - 1 + count) % count;
                  nextTime = lastTime;
                  lastTime = inputArray[lastInputIndex];
                }
                const lastOutputIndex = lastInputIndex * outputSize;
                const nextOutputIndex = nextInputIndex * outputSize;
                const weight = (time - lastTime) / (nextTime - lastTime);
                const lastValues = outputArray.slice(
                  lastOutputIndex,
                  lastOutputIndex + outputSize);
                const nextValues = outputArray.slice(
                  nextOutputIndex,
                  nextOutputIndex + outputSize);
                const result = new Array(outputSize);
                for (let i = outputSize; i--;) {
                  const lastValue = lastValues[i];
                  const nextValue = lastValues[i];
                  result[i] = lastValue + (nextValue - lastValue) * weight;
                }
                return result;
              };
              break;
            case "STEP":
              // Todo
              break;
            case "CUBICSPLINE":
              // Todo
              break;
          }
          return samplerFunction;
        });
        const channelFunctions = channels.map(channel => {
          const {
            target,
            sampler
          } = channel;
          const {
            node: nodeIndex,
            path
          } = target;
          const samplerFunction = samplerFunctions[sampler];
          const node = thisNodes[nodeIndex];
          return function (time) {
            node[path] = samplerFunction(time);
          };
        });
        const animationCache = {
          samplerFunctions,
          channelFunctions
        };
        animationCache.draw = function (time) {
          for (const channelFunction of channelFunctions)
            channelFunction(time);
        };
        return animationCache;
      });
    } else
      this.animations = [];
  }

  renderMesh(mesh) {
    const {
      primitives
    } = mesh;
    for (const primitive of primitives)
      primitive.draw();
  }

  renderAnimations(time) {
    const {
      animations
    } = this;
    for (const animation of animations)
      animation.draw(time);
  }

  renderSkin(skin) {
    const {
      renderer
    } = this;
    const {
      joints
    } = skin;
    let index = 0;
    for (const joint of joints) {
      const {
        inverseBindMatrix,
        node
      } = joint;
      const {
        globalJointTransform
      } = node;
      const uniform = `u_jointMatrix[${index++}]`;
      const jointMatrix = Mat4.multiply(
        globalJointTransform,
        inverseBindMatrix);
      renderer.setUniformMat4(uniform, jointMatrix);
      joint.jointMatrix = jointMatrix;
    }
  }

  renderNode(node, transform) {
    const {
      children,
      mesh,
      skin,
      matrix
    } = node;
    if (matrix != undefined)
      transform = Mat4.multiply(transform, matrix);
    else {
      const {
        translation,
        rotation,
        scale
      } = node;
      if (translation != undefined)
        transform = Mat4.multiply(
          transform,
          Mat4.toTranslationMatrix(translation));
      if (rotation != undefined)
        transform = Mat4.multiply(
          transform,
          Mat4.toRotationMatrix(rotation));
      if (scale != undefined)
        transform = Mat4.multiply(
          transform,
          Mat4.toScaleMatrix(scale));
    }
    node.globalJointTransform = transform;
    if (children != undefined)
      for (const child of children)
        this.renderNode(child, transform);
    if (skin != undefined)
      this.renderSkin(skin);
    if (mesh != undefined)
      this.renderMesh(mesh);
  }

  renderScene(scene = this.defaultScene, transform = Mat4.identity) {
    const {
      nodes
    } = scene;
    for (const node of nodes)
      this.renderNode(node, Mat4.identity);
  }
}
