// src/lib/oslRunner.ts
// OSLRunner v0.3 (TypeScript) - lightweight canvas-based OSL runtime
// Focused on the OSL flavor used in your examples (images, text, goto, input, sound, simple math, mainloop)

type Token = { type: string; val?: string | number };
type Stmt =
  | { t: 'ASSIGN'; left: string; expr: Token[] }
  | { t: 'CALL'; name: string; args: Token[]; style?: string }
  | { t: 'IF'; cond: Token[]; body: Token[]; elseBody?: Token[] }
  | { t: 'GOTO'; parts: Token[] }
  | { t: 'IMPORT'; mod: string }
  | { t: 'LABEL'; name: string };

type RunnerOptions = {
  debug?: boolean;
  onLog?: (s: string) => void;
  imageCrossOrigin?: string | null;
};

export class OSLRunner {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  source: string;
  opts: RunnerOptions;
  tokens: Token[] = [];
  stmts: Stmt[] = [];
  vars: Record<string, any> = {};
  images = new Map<string, HTMLImageElement>();
  sounds = new Map<string, HTMLAudioElement>();
  running = false;
  raf = 0;
  mouse = { x: 0, y: 0, down: false };
  keys = new Set<string>();
  offset = { x: 0, y: 0 };
  uiElements: any[] = [];
  lastFrameTime = 0;
  labelIndex = new Map<string, number>();
  debugLog: (s: string) => void;

  constructor(canvas: HTMLCanvasElement, source: string, opts?: RunnerOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context required');
    this.ctx = ctx;
    this.source = source || '';
    this.opts = { debug: false, imageCrossOrigin: 'anonymous', ...(opts || {}) };
    this.debugLog = this.opts.onLog || (s => { if (this.opts.debug) console.log('[OSL] ' + s); });

    // Default runtime vars
    this.vars = {
      window: { width: 640, height: 360 },
      mouse_x: 0,
      mouse_y: 0,
      mouse_down: false,
      direction: 90, // facing right (degrees)
    };

    this.setupInput();
    this.rebuild();
  }

  log(s: string) { this.debugLog(s); }

  // ---------- Parsing (simple line-based tokenizer + statements) ----------
  rebuild() {
    this.tokens = this.tokenize(this.source);
    this.stmts = this.parse(this.tokens);
    // index labels
    this.labelIndex.clear();
    for (let i = 0; i < this.stmts.length; i++) {
      const s = this.stmts[i];
      if (s.t === 'LABEL') this.labelIndex.set((s as any).name, i);
    }
  }

  tokenize(src: string): Token[] {
    const out: Token[] = [];
    const lines = src.split(/\r?\n/);
    const tokenRe = /\s*(?:(\/\/.*$)|(\"(?:\\.|[^\"])*\")|([A-Za-z_][A-Za-z0-9_\.]*)|(\d+(?:\.\d+)?)|(:)|(\()|(\))|([+\-*\/=])|(#(?:[0-9A-Fa-f]{3,8}))|(\.)|(.))/;
    for (const rawLine of lines) {
      const line = rawLine.replace(/\t/g, ' ').trim();
      if (line.length === 0) { out.push({ type: 'NEWLINE' }); continue; }
      let i = 0;
      while (i < line.length) {
        const slice = line.slice(i);
        const m = tokenRe.exec(slice);
        if (!m) break;
        i += m[0].length;
        if (m[1]) break; // comment
        if (m[2]) { // string
          out.push({ type: 'STRING', val: JSON.parse(m[2]) });
          continue;
        }
        if (m[3]) { out.push({ type: 'IDENT', val: m[3] }); continue; }
        if (m[4]) { out.push({ type: 'NUMBER', val: Number(m[4]) }); continue; }
        if (m[5]) { out.push({ type: 'COLON' }); continue; }
        if (m[6]) { out.push({ type: 'LPAREN' }); continue; }
        if (m[7]) { out.push({ type: 'RPAREN' }); continue; }
        if (m[8]) { out.push({ type: 'OP', val: m[8] }); continue; }
        if (m[9]) { out.push({ type: 'COLOR', val: m[9] }); continue; }
        if (m[10]) { out.push({ type: 'DOT' }); continue; }
        if (m[11]) { out.push({ type: 'SYMBOL', val: m[11] }); continue; }
      }
      out.push({ type: 'NEWLINE' });
    }
    return out;
  }

  parse(tokens: Token[]): Stmt[] {
    const stmts: Stmt[] = [];
    let i = 0;
    const peek = () => tokens[i];
    const next = () => tokens[i++];

    while (i < tokens.length) {
      if (!peek()) break;
      if (peek().type === 'NEWLINE') { next(); continue; }

      // label e.g., mainloop:
      if (peek().type === 'IDENT') {
        const ident = (peek().val as string);
        // check for label: if next token after IDENT is NEWLINE and ident ends with ':'? Our lexer splits ':'
        // We'll inspect the raw tokens ahead: if the immediate token after IDENT is NEWLINE, but we want to detect explicit label 'name:' so check if following token later doesn't exist
      }

      // Handle import
      if (peek().type === 'IDENT' && peek().val === 'import') {
        next(); // import
        const s = next();
        if (s && s.type === 'STRING') stmts.push({ t: 'IMPORT', mod: String(s.val) });
        while (peek() && peek().type !== 'NEWLINE') next();
        continue;
      }

      // Label detection: IDENT followed by SYMBOL ':' or just IDENT then NEWLINE and previous token had a colon char
      // Simpler: detect pattern IDENT NEWLINE where IDENT token value ends with ':' in source? We don't have that; Instead: detect when an IDENT token is immediately followed by COLON token (we added COLON via tokenRe if colon appears)
      if (peek().type === 'IDENT' && tokens[i + 1] && tokens[i + 1].type === 'COLON') {
        const name = String(next().val);
        next(); // colon
        // swallow to newline
        while (peek() && peek().type !== 'NEWLINE') next();
        stmts.push({ t: 'LABEL', name });
        continue;
      }

      // If statement: if <cond> ( body ) [ else ( body ) ]
      if (peek().type === 'IDENT' && peek().val === 'if') {
        next(); // consume if
        // collect cond tokens until LPAREN
        const cond: Token[] = [];
        while (peek() && peek().type !== 'LPAREN' && peek().type !== 'NEWLINE') cond.push(next());
        // expect LPAREN
        if (peek() && peek().type === 'LPAREN') {
          next();
          const body: Token[] = [];
          let depth = 1;
          while (peek() && depth > 0) {
            const t = next();
            if (!t) break;
            if (t.type === 'LPAREN') { depth++; body.push(t); }
            else if (t.type === 'RPAREN') { depth--; if (depth > 0) body.push(t); }
            else body.push(t);
          }
          // else
          let elseBody: Token[] | undefined;
          // skip newlines
          while (peek() && peek().type === 'NEWLINE') next();
          if (peek() && peek().type === 'IDENT' && peek().val === 'else') {
            next(); // else
            if (peek() && peek().type === 'LPAREN') {
              next();
              const eb: Token[] = [];
              let d2 = 1;
              while (peek() && d2 > 0) {
                const t2 = next();
                if (!t2) break;
                if (t2.type === 'LPAREN') { d2++; eb.push(t2); }
                else if (t2.type === 'RPAREN') { d2--; if (d2 > 0) eb.push(t2); }
                else eb.push(t2);
              }
              elseBody = eb;
            }
          }
          stmts.push({ t: 'IF', cond, body, elseBody });
        } else {
          // malformed; skip to newline
          while (peek() && peek().type !== 'NEWLINE') next();
        }
        continue;
      }

      // goto line (rest of line is parts)
      if (peek().type === 'IDENT' && peek().val === 'goto') {
        next();
        const parts: Token[] = [];
        while (peek() && peek().type !== 'NEWLINE') parts.push(next());
        stmts.push({ t: 'GOTO', parts });
        continue;
      }

      // generic line starting with IDENT -> assign or call
      if (peek().type === 'IDENT') {
        const startIdx = i;
        const lineTokens: Token[] = [];
        while (peek() && peek().type !== 'NEWLINE') lineTokens.push(next());
        // detect assign: IDENT (DOT IDENT)* OP '=' ...
        // find '=' operator index
        const eqIdx = lineTokens.findIndex(x => x.type === 'OP' && x.val === '=');
        if (eqIdx >= 1) {
          // left is lineTokens[0..eqIdx-1]
          const leftParts: string[] = [];
          for (let k = 0; k < eqIdx; k++) {
            const t = lineTokens[k];
            if (t.type === 'IDENT') leftParts.push(String(t.val));
            if (t.type === 'DOT') leftParts.push('.');
          }
          // collapse dotted name
          const left = leftParts.join('').replace(/\.$/, '');
          const right = lineTokens.slice(eqIdx + 1);
          stmts.push({ t: 'ASSIGN', left, expr: right });
        } else {
          // call-like: first token IDENT, rest are args (strings, numbers, colors, identifiers, colon style)
          const nameTok = lineTokens[0];
          const args: Token[] = [];
          let style: string | undefined;
          for (let k = 1; k < lineTokens.length; k++) {
            const tk = lineTokens[k];
            if (tk.type === 'COLON') {
              // style rest as simple string
              const tail = lineTokens.slice(k + 1).map(x => (x.val ?? x.type)).join(' ');
              style = String(tail);
              break;
            } else args.push(tk);
          }
          stmts.push({ t: 'CALL', name: String(nameTok.val), args, style });
        }
        continue;
      }

      // otherwise skip to newline
      while (peek() && peek().type !== 'NEWLINE') next();
      next();
    }

    return stmts;
  }

  // ---------- Minimal expression evaluator ----------
  evalTokens(ts: Token[]): any {
    if (!ts || ts.length === 0) return null;
    // simple one-token
    if (ts.length === 1) {
      const t = ts[0];
      if (t.type === 'NUMBER') return t.val;
      if (t.type === 'STRING') return t.val;
      if (t.type === 'COLOR') return t.val;
      if (t.type === 'IDENT') {
        const name = String(t.val);
        // check dotted
        if (name.includes('.')) return this.getVar(name);
        if (name === 'true') return true;
        if (name === 'false') return false;
        return this.vars[name] !== undefined ? this.vars[name] : name;
      }
    }

    // detect binary operators (single op handling for simplicity)
    for (let i = 0; i < ts.length; i++) {
      if (ts[i].type === 'OP') {
        const op = String(ts[i].val);
        const left = this.evalTokens(ts.slice(0, i));
        const right = this.evalTokens(ts.slice(i + 1));
        if (op === '+') return (left || 0) + (right || 0);
        if (op === '-') return (left || 0) - (right || 0);
        if (op === '*') return (left || 0) * (right || 0);
        if (op === '/') return (left || 0) / (right || 0);
        if (op === '=') return right;
      }
    }

    // detect dotted property like msg.len or arr.len or direction.sin (sin = treat as math helper)
    if (ts.length >= 3 && ts[0].type === 'IDENT' && ts[1].type === 'DOT' && ts[2].type === 'IDENT') {
      const nameParts: string[] = [];
      for (let p = 0; p < ts.length; p++) {
        if (ts[p].type === 'IDENT' || ts[p].type === 'DOT') nameParts.push(String(ts[p].val ?? '.'));
      }
      const name = nameParts.join('');
      // special: .len
      if (name.endsWith('.len')) {
        const base = name.slice(0, -4);
        const v = this.getVar(base);
        if (v == null) return 0;
        if (typeof v === 'string' || Array.isArray(v)) return v.length;
        return 0;
      }
      // direction.sin etc: treat as math on degrees
      if (name.startsWith('direction.')) {
        const fn = name.split('.')[1];
        const deg = Number(this.vars.direction || 0);
        const rad = deg * (Math.PI / 180);
        if (fn === 'sin') return Math.sin(rad);
        if (fn === 'cos') return Math.cos(rad);
        if (fn === 'tan') return Math.tan(rad);
      }
      // axes access like gamepads[1].axes[1].x isn't handled here; other code uses getVar()
      return this.getVar(name);
    }

    // fallback: strings concatenation / identifiers & numbers
    const evaluated = ts.map(t => {
      if (t.type === 'STRING' || t.type === 'COLOR') return t.val;
      if (t.type === 'NUMBER') return t.val;
      if (t.type === 'IDENT') return (this.vars[String(t.val)] !== undefined ? this.vars[String(t.val)] : String(t.val));
      return '';
    });
    // if any element is string -> join
    if (evaluated.some(x => typeof x === 'string')) return evaluated.join('');
    // else sum numbers
    return evaluated.reduce((a, b) => (a || 0) + (b || 0), 0);
  }

  getVar(dotted: string) {
    const parts = dotted.split('.');
    let cur: any = this.vars;
    for (const p of parts) {
      if (p === 'len') {
        if (typeof cur === 'string' || Array.isArray(cur)) { cur = cur.length; continue; }
      }
      if (cur === undefined || cur === null) return undefined;
      // support numeric indexing like arr[1] is NOT fully implemented here
      cur = cur[p];
    }
    return cur;
  }

  setVar(dotted: string, value: any) {
    const parts = dotted.split('.');
    let cur: any = this.vars;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!cur[p]) cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  }

  // ---------- Builtin implementations ----------
  async builtin_call(name: string, argsTokens: Token[], style?: string) {
    const args = argsTokens.map(t => this.evalTokens([t])); // very simple: evaluate each token single
    // Common commands
    if (name === 'rotur') { this.log('rotur ' + args.join(',')); return; }
    if (name === 'c') { // set current color override
      this.vars._currentColor = String(args[0] ?? '#fff'); return;
    }
    if (name === 'window') {
      // window "dimensions" w h or window "resizable" false etc.
      if (typeof args[0] === 'string') {
        const key = args[0] as string;
        if (key === 'dimensions') {
          const w = Number(args[1] || 640), h = Number(args[2] || 360);
          this.vars.window = this.vars.window || {};
          this.vars.window.width = w; this.vars.window.height = h;
          this.canvas.width = w; this.canvas.height = h;
        } else {
          this.vars.window = this.vars.window || {};
          this.vars.window[key] = args[1];
        }
      }
      return;
    }
    if (name === 'image') {
      // image url [w] [h] or image url scale
      const url = String(args[0]);
      const w = args[1] !== undefined ? Number(args[1]) : undefined;
      const h = args[2] !== undefined ? Number(args[2]) : undefined;
      await this.drawImageAtOrigin(url, w, h);
      return;
    }
    if (name === 'text') {
      const txt = argsTokens.length ? this.evalTokens(argsTokens) : '';
      const size = typeof args[1] === 'number' ? Number(args[1]) : 16;
      this.uiElements.push({ type: 'text', text: String(txt), size, color: this.vars._currentColor || '#fff' });
      return;
    }
    if (name === 'sound') {
      // sound "url|id" action ...
      const id = String(args[0] || '');
      const action = String(args[1] || 'load');
      if (action === 'load') {
        await this.loadSound(id);
      } else if (action === 'start') {
        const vol = Number(args[2] ?? 1);
        this.playSound(id, vol);
      } else if (action === 'volume') {
        const vol = Number(args[1] ?? 1);
        const s = this.sounds.get(id);
        if (s) s.volume = vol;
      }
      return;
    }
    if (name === 'save') {
      // save "path" "set_directory" or save "file" "set" value
      const what = String(args[0] || '');
      const action = String(args[1] || '');
      if (action === 'set_directory') {
        // store base path
        this.vars._save_dir = what;
      } else if (action === 'set') {
        const val = args[2] ?? '';
        localStorage.setItem(`${this.vars._save_dir || ''}/${what}`, JSON.stringify(val));
      } else if (action === 'get') {
        const v = localStorage.getItem(`${this.vars._save_dir || ''}/${what}`);
        this.vars[what] = v ? JSON.parse(v) : null;
      }
      return;
    }
    if (name === 'random') {
      // random(a,b)
      const a = Number(args[0] ?? 0); const b = Number(args[1] ?? 1);
      return Math.floor(Math.random() * (b - a + 1)) + a;
    }
    if (name === 'dist') {
      const x1 = Number(args[0] ?? 0); const y1 = Number(args[1] ?? 0);
      const x2 = Number(args[2] ?? 0); const y2 = Number(args[3] ?? 0);
      return Math.hypot(x1 - x2, y1 - y2);
    }
    if (name === 'getGamepads') {
      const g = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
      // convert to small structure
      const small = g.map((gp: any) => gp ? {
        id: gp.id, axes: gp.axes, buttons: (gp.buttons || []).map((b: any) => ({ pressed: !!b.pressed, value: b.value })),
      } : null);
      return small;
    }
    // fallback: log
    this.log(`unhandled call: ${name}(${args.join(',')})`);
  }

  // ---------- Image / Audio helpers ----------
  async loadImage(url: string): Promise<HTMLImageElement> {
    if (this.images.has(url)) return this.images.get(url)!;
    const img = new Image();
    if (this.opts.imageCrossOrigin) img.crossOrigin = this.opts.imageCrossOrigin;
    img.src = url;
    await new Promise((res, rej) => { img.onload = () => res(null); img.onerror = (e) => rej(e); });
    this.images.set(url, img);
    return img;
  }

  async loadSound(idOrUrl: string): Promise<HTMLAudioElement | null> {
    if (this.sounds.has(idOrUrl)) return this.sounds.get(idOrUrl)!;
    // treat idOrUrl that looks like url as url, otherwise no-op
    if (/^https?:\/\//.test(idOrUrl)) {
      const a = new Audio(idOrUrl);
      this.sounds.set(idOrUrl, a);
      return a;
    } else {
      // ID mapping: no remote file loaded; maybe previously started with url id
      return null;
    }
  }

  playSound(idOrUrl: string, volume = 1.0) {
    const s = this.sounds.get(idOrUrl);
    if (s) { s.pause(); s.currentTime = 0; s.volume = volume; s.play().catch(() => { /* Autoplay restrictions */ }); }
    else {
      // maybe idOrUrl is alias for loaded file: try treat as id (no-op)
      this.log('sound not loaded: ' + idOrUrl);
    }
  }

  // Draw image at current origin (this.offset used by render); this pushes a UI command to be rendered this frame
  async drawImageAtOrigin(url: string, w?: number, h?: number) {
    try {
      const img = await this.loadImage(url);
      // store as element to draw in uiElements (with position being current offset)
      this.uiElements.push({ type: 'image', url, img, w: w || img.width, h: h || img.height, x: 0, y: 0 });
    } catch (e) {
      this.log('image load failed: ' + url);
    }
  }

  // ---------- Input ----------
  setupInput() {
    this.canvas.addEventListener('mousemove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
      this.vars.mouse_x = this.mouse.x;
      this.vars.mouse_y = this.mouse.y;
    });
    window.addEventListener('mousedown', (e) => { this.mouse.down = true; this.vars.mouse_down = true; });
    window.addEventListener('mouseup', (e) => { this.mouse.down = false; this.vars.mouse_down = false; });
    window.addEventListener('keydown', (e) => { this.keys.add(e.key.toLowerCase()); });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.key.toLowerCase()); });
  }

  // ---------- Execution & Render Loop ----------
  start() {
    if (this.running) return;
    this.running = true;
    this.canvas.width = (this.vars.window?.width) || this.canvas.width;
    this.canvas.height = (this.vars.window?.height) || this.canvas.height;
    this.lastFrameTime = performance.now();
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  tick(time: number) {
    if (!this.running) return;
    const dt = Math.min(50, time - this.lastFrameTime); // ms
    this.lastFrameTime = time;

    // Evaluate script each frame by walking statements sequentially.
    // For label/goto/mainloop behavior we simply execute statements in order, but we can allow "label" to be used as jump destination:
    for (let si = 0; si < this.stmts.length; si++) {
      const stmt = this.stmts[si];
      if (!stmt) continue;
      switch (stmt.t) {
        case 'IMPORT': /* noop */ break;
        case 'LABEL': /* noop */ break;
        case 'ASSIGN': {
          const val = this.evalTokens((stmt as any).expr);
          this.setVar((stmt as any).left, val);
          break;
        }
        case 'CALL': {
          const c = stmt as any;
          // support "if onclick" style where later we attach handlers - not implemented here fully
          this.builtin_call(c.name, c.args, c.style);
          break;
        }
        case 'IF': {
          const st = stmt as any;
          const condVal = this.evalTokens(st.cond);
          if (condVal) {
            // parse body tokens into temporary stmts and execute them inline by parsing tokens -> string -> stmts
            const bodySource = this.tokensToSource(st.body);
            const r = new OSLRunner(this.canvas, bodySource, this.opts); // lightweight parse
            // Instead of constructing a new runner (costly), we can parse and execute quickly by direct parse
            const parsed = this.parse(st.body);
            for (const ps of parsed) {
              if (ps.t === 'CALL') { this.builtin_call((ps as any).name, (ps as any).args, (ps as any).style); }
              if (ps.t === 'ASSIGN') { const v = this.evalTokens((ps as any).expr); this.setVar((ps as any).left, v); }
            }
          } else if (stmt.elseBody) {
            const parsed = this.parse(stmt.elseBody);
            for (const ps of parsed) {
              if (ps.t === 'CALL') { this.builtin_call((ps as any).name, (ps as any).args, (ps as any).style); }
              if (ps.t === 'ASSIGN') { const v = this.evalTokens((ps as any).expr); this.setVar((ps as any).left, v); }
            }
          }
          break;
        }
        case 'GOTO': {
          // simple: evaluate tokens into two numbers split in half
          const parts = (stmt as any).parts as Token[];
          const half = Math.max(1, Math.floor(parts.length / 2));
          const x = this.evalTokens(parts.slice(0, half)) || 0;
          const y = this.evalTokens(parts.slice(half)) || 0;
          this.offset.x = Number(x) || 0;
          this.offset.y = Number(y) || 0;
          break;
        }
      }
    }

    // -- update frame state (gamepad snapshot etc.)
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    this.vars.gamepads = gps;

    // render UIElements collected via builtin calls this frame
    this.render();

    // cleanup UI elements prepared this frame (images/text queued)
    this.uiElements = [];

    // schedule next frame
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  tokensToSource(tokens: Token[]): string {
    // Convert tokens fragment to a source string (best-effort)
    let out = '';
    for (const t of tokens) {
      if (t.type === 'STRING') out += `"${String(t.val)}" `;
      else if (t.type === 'NUMBER') out += `${Number(t.val)} `;
      else if (t.type === 'IDENT') out += `${String(t.val)} `;
      else if (t.type === 'COLOR') out += `${String(t.val)} `;
      else if (t.type === 'OP') out += `${String(t.val)} `;
      else if (t.type === 'LPAREN') out += `( `;
      else if (t.type === 'RPAREN') out += `) `;
      else if (t.type === 'COLON') out += ': ';
      else out += `${t.type} `;
    }
    return out.trim();
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    // clear
    ctx.clearRect(0, 0, w, h);

    // apply offset (origin translation)
    ctx.save();
    ctx.translate(this.offset.x, this.offset.y);

    // draw queued images/text/sprites
    for (const el of this.uiElements) {
      if (el.type === 'image') {
        try {
          const img: HTMLImageElement = el.img || this.images.get(el.url)!;
          if (img) ctx.drawImage(img, el.x, el.y, el.w, el.h);
        } catch (e) { /* ignore draw errors */ }
      } else if (el.type === 'text') {
        ctx.fillStyle = el.color || '#fff';
        ctx.font = `${el.size || 16}px Arial`;
        ctx.fillText(String(el.text), el.x || 10, el.y || 20);
      }
    }

    // restore
    ctx.restore();
  }
}
