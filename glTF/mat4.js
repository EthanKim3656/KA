export default {
	identity: [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	],
	getIndex: function(x, y) {
		return x + (y << 2);
	},
	add: function(a, b) {
		return [
			a[0x0] + b[0x0],
			a[0x1] + b[0x1],
			a[0x2] + b[0x2],
			a[0x3] + b[0x3],
			a[0x4] + b[0x4],
			a[0x5] + b[0x5],
			a[0x6] + b[0x6],
			a[0x7] + b[0x7],
			a[0x8] + b[0x8],
			a[0x9] + b[0x9],
			a[0xA] + b[0xA],
			a[0xB] + b[0xB],
			a[0xC] + b[0xC],
			a[0xD] + b[0xD],
			a[0xE] + b[0xE],
			a[0xF] + b[0xF]
		];
	},
	subtract: function(a, b) {
		return [
			a[0x0] - b[0x0],
			a[0x1] - b[0x1],
			a[0x2] - b[0x2],
			a[0x3] - b[0x3],
			a[0x4] - b[0x4],
			a[0x5] - b[0x5],
			a[0x6] - b[0x6],
			a[0x7] - b[0x7],
			a[0x8] - b[0x8],
			a[0x9] - b[0x9],
			a[0xA] - b[0xA],
			a[0xB] - b[0xB],
			a[0xC] - b[0xC],
			a[0xD] - b[0xD],
			a[0xE] - b[0xE],
			a[0xF] - b[0xF]
		];
	},
	multiply: function(a, b) {
		const [
			a0, a1, a2, a3,
			a4, a5, a6, a7,
			a8, a9, aa, ab,
			ac, ad, ae, af
		] = a;
		const [
			b0, b1, b2, b3,
			b4, b5, b6, b7,
			b8, b9, ba, bb,
			bc, bd, be, bf
		] = b;
		return [
			a0 * b0 + a4 * b1 + a8 * b2 + ac * b3,
			a1 * b0 + a5 * b1 + a9 * b2 + ad * b3,
			a2 * b0 + a6 * b1 + aa * b2 + ae * b3,
			a3 * b0 + a7 * b1 + ab * b2 + af * b3,
			a0 * b4 + a4 * b5 + a8 * b6 + ac * b7,
			a1 * b4 + a5 * b5 + a9 * b6 + ad * b7,
			a2 * b4 + a6 * b5 + aa * b6 + ae * b7,
			a3 * b4 + a7 * b5 + ab * b6 + af * b7,
			a0 * b8 + a4 * b9 + a8 * ba + ac * bb,
			a1 * b8 + a5 * b9 + a9 * ba + ad * bb,
			a2 * b8 + a6 * b9 + aa * ba + ae * bb,
			a3 * b8 + a7 * b9 + ab * ba + af * bb,
			a0 * bc + a4 * bd + a8 * be + ac * bf,
			a1 * bc + a5 * bd + a9 * be + ad * bf,
			a2 * bc + a6 * bd + aa * be + ae * bf,
			a3 * bc + a7 * bd + ab * be + af * bf
		];
	},
	invert: function(m) {
		let [
			m0, m1, m2, m3,
			m4, m5, m6, m7,
			m8, m9, ma, mb,
			mc, md, me, mf
		] = m;
		let r0 = 1 / m0;
		m1 *= r0;
		m2 *= r0;
		m3 *= r0;
		m5 -= m1 * m4;
		m6 -= m2 * m4;
		m7 -= m3 * m4;
		let r4 = -r0 * m4;
		m9 -= m1 * m8;
		ma -= m2 * m8;
		mb -= m3 * m8;
		let r8 = -r0 * m8;
		md -= m1 * mc;
		me -= m2 * mc;
		mf -= m3 * mc;
		let rc = -r0 * mc;
		let r5 = 1 / m5;
		m6 *= r5;
		m7 *= r5;
		r4 *= r5;
		m2 -= m6 * m1;
		m3 -= m7 * m1;
		r0 -= r4 * m1;
		let r1 = -r5 * m1;
		ma -= m6 * m9;
		mb -= m7 * m9;
		r8 -= r4 * m9;
		let r9 = -r5 * m9;
		me -= m6 * md;
		mf -= m7 * md;
		rc -= r4 * md;
		let rd = -r5 * md;
		let ra = 1 / ma;
		mb *= ra;
		r8 *= ra;
		r9 *= ra;
		m3 -= mb * m2;
		r0 -= r8 * m2;
		r1 -= r9 * m2;
		let r2 = -ra * m2;
		m7 -= mb * m6;
		r4 -= r8 * m6;
		r5 -= r9 * m6;
		let r6 = -ra * m6;
		mf -= mb * me;
		rc -= r8 * me;
		rd -= r9 * me;
		let re = -ra * me;
		let rf = 1 / mf;
		rc *= rf;
		rd *= rf;
		re *= rf;
		r0 -= rc * m3;
		r1 -= rd * m3;
		r2 -= re * m3;
		let r3 = -rf * m3;
		r4 -= rc * m7;
		r5 -= rd * m7;
		r6 -= re * m7;
		let r7 = -rf * m7;
		r8 -= rc * mb;
		r9 -= rd * mb;
		ra -= re * mb;
		let rb = -rf * mb;
		return [
			r0, r1, r2, r3,
			r4, r5, r6, r7,
			r8, r9, ra, rb,
			rc, rd, re, rf
		];
	},
	transpose: function(m) {
		const [
			m0, m1, m2, m3,
			m4, m5, m6, m7,
			m8, m9, ma, mb,
			mc, md, me, mf
		] = m;
		return [
			m0, m4, m8, mc,
			m1, m5, m9, md,
			m2, m6, ma, me,
			m3, m7, mb, mf
		];
	},
	toRotationMatrix: function(q) {
		let [x, y, z, s] = q;
		return [
			1 - 2 * (y * y + z * z),
			2 * (x * y + s * z),
			2 * (x * z - s * y),
			0,
			2 * (x * y - s * z),
			1 - 2 * (x * x + z * z),
			2 * (y * z + s * x),
			0,
			2 * (x * z + s * y),
			2 * (y * z - s * x),
			1 - 2 * (x * x + y * y),
			0,
			0,
			0,
			0,
			1
		];
	},
	toTranslationMatrix: function(c) {
		return [
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			c[0], c[1], c[2], 1
		];
	},
	toScaleMatrix: function(c) {
		return [
			c[0], 0, 0, 0,
			0, c[1], 0, 0,
			0, 0, c[2], 0,
			0, 0, 0, 1
		];
	}
};
