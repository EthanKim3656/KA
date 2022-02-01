import Mat4 from "./mat4.js"

export default class Renderer {
  static CAMERA_PERSPECTIVE = 0;
  static CAMERA_ORTHOGRAPHIC = 1;

  constructor(info = {}) {
    const {
      width = window.innerWidth,
      height = window.innerHeight,
      options = {
        antialias: false
      },
      canvas = (() => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const {
          style
        } = canvas;
        style.position = "absolute";
        style.left = "0px";
        style.top = "0px";
        document.body.appendChild(canvas);
        return canvas;
      })(),
      gl = (() => {
        const gl = canvas.getContext("webgl2", options);
        gl.clearColor(0.5, 0.5, 0.5, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.CULL_FACE);
        return gl;
      })()
    } = info;
    this.width = width;
    this.height = height;
    this.canvas = canvas;
    this.gl = gl;
    this.programs = {};
    this.attributeLocations = {};
    this.uniformLocations = {};
  }

  createProgram(vertexShaderCode, fragmentShaderCode) {
    const {
      gl
    } = this;
    const vertexShader = this.createShader(
      gl.VERTEX_SHADER, vertexShaderCode);
    const fragmentShader = this.createShader(
      gl.FRAGMENT_SHADER, fragmentShaderCode);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      console.error(gl.getProgramInfoLog(program));
    gl.detachShader(program, vertexShader);
    gl.deleteShader(vertexShader);
    gl.detachShader(program, fragmentShader);
    gl.deleteShader(fragmentShader);
    gl.useProgram(program);
    return program;
  }

  createShader(type, code) {
    const {
      gl
    } = this;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      console.error(gl.getShaderInfoLog(shader));
    return shader;
  }

  locateAttribute(program, attribute) {
    this.attributeLocations[attribute] = this.gl.getAttribLocation(
      program,
      attribute);
  }

  locateUniform(program, uniform) {
    this.uniformLocations[uniform] = this.gl.getUniformLocation(
      program,
      uniform);
  }

  setAttribute(location, info) {
    const {
      gl
    } = this;
    const buffer = gl.createBuffer();
    gl.bindBuffer(0x8892, buffer);
    gl.bufferData(0x8892, info.array, 0x88E4);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(
      location,
      info.size ?? 3,
      info.type ?? 0x1406,
      info.normalize ?? false,
      info.stride ?? 0,
      info.offset ?? 0);
    return buffer;
  }

  assertCameraAspect(info) {
    let {
      width,
      height,
      aspect
    } = info;
    switch ((width == undefined) |
    (height == undefined) << 1 |
    (aspect == undefined) << 2) {
      case 0b111:
        width = this.width;
        height = this.height;
        aspect = width / height;
        break;
      case 0b110:
        height = this.height;
        aspect = width / height;
        break;
      case 0b101:
        width = this.width;
        aspect = width / height;
        break;
      case 0b100:
        aspect = width / height;
        break;
      case 0b011:
        const windowWidth = this.width;
        const windowHeight = this.height;
        const windowAspect = windowWidth / windowHeight;
        if (windowAspect > aspect) {
          width = windowWidth;
          height = windowWidth / aspect;
        } else if (windowAspect < aspect) {
          width = windowHeight * aspect;
          height = windowHeight;
        } else {
          width = windowWidth;
          height = windowHeight;
        }
        break;
      case 0b010:
        height = windowWidth / aspect;
        break;
      case 0b001:
        width = windowHeight * aspect;
        break;
      case 0b000:
        const realAspect = width / height;
        if (realAspect > aspect)
          height = width / aspect;
        else if (windowAspect < aspect)
          width = height * aspect;
        break;
    }
    info.width = width;
    info.height = height;
    info.aspect = aspect;
  }

  buildPerspectiveCamera(info = {}) {
    this.assertCameraAspect(info);
    const camera = {
      type: Renderer.CAMERA_PERSPECTIVE,
      width: info.width,
      height: info.height,
      aspect: info.aspect,
      rotateX: info.rotateX ?? 0,
      rotateY: info.rotateY ?? 0,
      rotateZ: info.rotateZ ?? 0,
      positionX: info.positionX ?? 0,
      positionY: info.positionY ?? 0,
      positionZ: info.positionZ ?? 0,
      fov: info.fov ?? Math.PI * 0.5,
      near: info.near ?? 0.01,
      far: info.far ?? 100
    };
    camera.generateAllMatrix = function () {
      const {
        aspect,
        rotateX: rx,
        rotateY: ry,
        rotateZ: rz,
        positionX: tx,
        positionY: ty,
        positionZ: tz,
        fov,
        near,
        far,
      } = camera;
      const fx = Math.tan(Math.PI * 0.5 + fov * 0.5);
      const fy = fx * aspect;
      const ir = 1 / (near - far);
      const dz = (near + far) * ir;
      const dw = (near * far) * ir * 2;
      const cx = Math.cos(rx);
      const sx = Math.sin(rx);
      const cy = Math.cos(ry);
      const sy = Math.sin(ry);
      const cz = Math.cos(rz);
      const sz = Math.sin(rz);
      const cycz = cy * cz;
      const cxsz = cx * sz;
      const sxcz = sx * cz;
      const cysz = cy * sz;
      const cxcz = cx * cz;
      const sxsz = sx * sz;
      const sxcy = sx * cy;
      const cxcy = cx * cy;
      const cxszsxczsy = cxsz + sxcz * sy;
      const sxszcxczsy = sxsz - cxcz * sy;
      const cxczsxszsy = cxcz - sxsz * sy;
      const sxczcxszsy = sxcz + cxsz * sy;
      const txcztysz = tx * cz - ty * sz;
      const txsztycz = tx * sz + ty * cz;
      const tzsytxcztyszcy = tz * sy + txcztysz * cy;
      const tzcytxcztyszsy = tz * cy - txcztysz * sy;
      const txsztyczcxtzcytxcztyszsysx = txsztycz * cx - tzcytxcztyszsy * sx;
      const txsztyczsxtzcytxcztyszsycx = txsztycz * sx + tzcytxcztyszsy * cx;
      return [
        cycz * fx,
        cxszsxczsy * fy,
        sxszcxczsy * dz,
        -sxszcxczsy,
        -cysz * fx,
        cxczsxszsy * fy,
        sxczcxszsy * dz,
        -sxczcxszsy,
        sy * fx,
        -sxcy * fy,
        cxcy * dz,
        -cxcy,
        tzsytxcztyszcy * fx,
        txsztyczcxtzcytxcztyszsysx * fy,
        txsztyczsxtzcytxcztyszsycx * dz + dw,
        -txsztyczsxtzcytxcztyszsycx
      ];
    }
    return camera;
  }

  buildOrthographicCamera(info = {}) {
  }

  buildArrayMesh(info) {
    const {
      gl,
      attributeLocations
    } = this;
    const {
      mode = 4,
      count,
      attributes
    } = info;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const attributeBuffers = {};
    for (const attribute in attributes) {
      attributeBuffers[attribute] = this.setAttribute(
        attributeLocations[attribute],
        attributes[attribute]);
    }
    gl.bindVertexArray(null);
    const draw = function () {
      gl.bindVertexArray(vao);
      gl.drawArrays(mode, 0, count);
      gl.bindVertexArray(null);
    }
    return {
      vao,
      buffers: attributeBuffers,
      draw
    };
  }

  buildIndexedMesh(info) {
    const {
      gl,
      attributeLocations
    } = this;
    const {
      mode = 4,
      indices,
      attributes
    } = info;
    const {
      count: indicesCount,
      type: indicesType,
      array: indicesArray
    } = indices;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const indicesBuffer = gl.createBuffer();
    gl.bindBuffer(0x8893, indicesBuffer);
    gl.bufferData(0x8893, indicesArray, 0x88E4);
    const attributeBuffers = {};
    for (const attribute in attributes)
      attributeBuffers[attribute] = this.setAttribute(
        attributeLocations[attribute],
        attributes[attribute]);
    gl.bindVertexArray(null);
    const draw = function () {
      gl.bindVertexArray(vao);
      gl.drawElements(mode, indicesCount, indicesType, 0);
      gl.bindVertexArray(null);
    }
    return {
      vao,
      buffers: attributeBuffers,
      draw
    };
  }

  buildDataTexture(info) {

  }

  buildImageTexture(info) {
    const {
      gl
    } = this;
    const {
      format = gl.RGBA,
      internalFormat = format,
      type = gl.UNSIGNED_BYTE,
      image,
      minFilter,
      magFilter,
      wrapS,
      wrapT
    } = info;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, format, type, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    if (minFilter != undefined)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    if (magFilter != undefined)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
    if (wrapS != undefined)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    if (wrapT != undefined)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    return texture;
  }

  setUniformMat4(uniform, value) {
    this.gl.uniformMatrix4fv(
      this.uniformLocations[uniform],
      false,
      value);
  }
}
