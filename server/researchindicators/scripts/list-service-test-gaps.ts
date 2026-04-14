/**
 * Genera docs/service-unit-test-gaps.md: métodos públicos de clases *Service
 * bajo src con sufijo .service.ts, sin evidencia clara de prueba en el spec colocalizado (.service.spec.ts).
 *
 * Criterios:
 * - Clases cuyo nombre termina en "Service".
 * - Métodos: MethodDeclaration no constructor, sin private o protected.
 * - Propiedades con inicializador arrow o function (API estilo campo).
 * - Cobertura heurística si existe spec: llamada .metodo( o jest.spyOn o spyOn con el nombre del método.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT_MD = path.join(ROOT, 'docs', 'service-unit-test-gaps.md');

function walkTsFiles(dir: string, acc: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTsFiles(p, acc);
    else if (ent.name.endsWith('.service.ts') && !ent.name.includes('.spec.'))
      acc.push(p);
  }
}

function loadSpecText(specPath: string): string | null {
  if (!fs.existsSync(specPath)) return null;
  return fs.readFileSync(specPath, 'utf8');
}

function methodLikelyTestedInSpec(specText: string, methodName: string): boolean {
  if (methodName.length === 0) return false;
  const escaped = methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`\\.${escaped}\\s*\\(`),
    new RegExp(`jest\\.spyOn\\s*\\([^,]+,\\s*['"]${escaped}['"]`),
    new RegExp(`spyOn\\s*\\([^,]+,\\s*['"]${escaped}['"]`),
  ];
  return patterns.some((re) => re.test(specText));
}

function collectPublicMethods(
  classNode: ts.ClassDeclaration,
): { name: string; kind: 'method' | 'property-fn' }[] {
  const seen = new Set<string>();
  const out: { name: string; kind: 'method' | 'property-fn' }[] = [];

  const push = (name: string, kind: 'method' | 'property-fn') => {
    if (seen.has(name)) return;
    seen.add(name);
    out.push({ name, kind });
  };

  for (const member of classNode.members) {
    if (ts.isConstructorDeclaration(member)) continue;

    if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
      const mods = ts.getCombinedModifierFlags(member);
      if (mods & ts.ModifierFlags.Private) continue;
      if (mods & ts.ModifierFlags.Protected) continue;
      push(member.name.text, 'method');
      continue;
    }

    if (ts.isPropertyDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
      const mods = ts.getCombinedModifierFlags(member);
      if (mods & ts.ModifierFlags.Private) continue;
      if (mods & ts.ModifierFlags.Protected) continue;
      const init = member.initializer;
      if (
        init &&
        (ts.isArrowFunction(init) || ts.isFunctionExpression(init))
      ) {
        push(member.name.text, 'property-fn');
      }
    }
  }

  return out;
}

function parseServiceFile(
  filePath: string,
): { className: string; methods: { name: string; kind: string }[] }[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const sf = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const services: {
    className: string;
    methods: { name: string; kind: string }[];
  }[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isClassDeclaration(node) && node.name?.text.endsWith('Service')) {
      services.push({
        className: node.name.text,
        methods: collectPublicMethods(node),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return services;
}

function rel(p: string): string {
  return path.relative(ROOT, p).split(path.sep).join('/');
}

function main(): void {
  const serviceFiles: string[] = [];
  walkTsFiles(SRC, serviceFiles);
  serviceFiles.sort();

  let withSpec = 0;
  let withoutSpec = 0;
  const sections: string[] = [];
  let globalIndex = 1;

  for (const filePath of serviceFiles) {
    const specPath = filePath.replace(/\.ts$/i, '.spec.ts');
    const specText = loadSpecText(specPath);
    if (specText !== null) withSpec++;
    else withoutSpec++;

    const serviceBlocks = parseServiceFile(filePath);
    if (serviceBlocks.length === 0) {
      sections.push(`## (sin clase *Service en AST)\n\n- Archivo: \`${rel(filePath)}\`\n`);
      continue;
    }

    for (const block of serviceBlocks) {
      const untested = block.methods.filter((m) => {
        if (!specText) return true;
        return !methodLikelyTestedInSpec(specText, m.name);
      });

      const lines: string[] = [];
      lines.push(`## ${block.className}`);
      lines.push('');
      lines.push(`- Archivo: \`${rel(filePath)}\``);
      lines.push(
        `- Spec: ${specText !== null ? `\`${rel(specPath)}\`` : '_ninguno_'}`,
      );
      lines.push('');

      if (block.methods.length === 0) {
        lines.push(
          '_Sin métodos públicos declarados en esta clase (solo constructor o API heredada de la clase base)._',
        );
        lines.push('');
        sections.push(lines.join('\n'));
        continue;
      }

      if (untested.length === 0) {
        lines.push(
          '_Todos los métodos públicos de esta clase tienen al menos una referencia heurística en el spec (revisar manualmente la calidad de la prueba)._',
        );
        lines.push('');
        sections.push(lines.join('\n'));
        continue;
      }

      for (const m of untested) {
        lines.push(
          `${globalIndex}. \`${block.className}.${m.name}\` _(tipo: ${m.kind})_`,
        );
        globalIndex++;
      }
      lines.push('');
      sections.push(lines.join('\n'));
    }
  }

  const totalGaps = globalIndex - 1;
  const header = `# Métodos de servicio sin prueba unitaria evidente

Generado por \`npm run docs:service-test-gaps\` (no editar a mano; volver a generar).

## Criterios

- **Alcance:** \`src/**/*.service.ts\` en el paquete **researchindicators** (sin \`.spec.\` en el nombre del archivo).
- **Clase:** nombre termina en \`Service\`.
- **Métodos listados:** \`MethodDeclaration\` público (sin \`private\` / \`protected\`), distinto de \`constructor\`; más propiedades con función flecha o \`function\` como valor inicial.
- **Sin \`*.service.spec.ts\`:** todos los métodos anteriores se consideran sin prueba de servicio.
- **Con spec:** se considera cubierto si el texto del spec contiene \`.nombreMetodo(\`, \`jest.spyOn(..., 'nombreMetodo')\` o \`spyOn(..., 'nombreMetodo')\`. Lo demás sigue listado (heurística; puede haber falsos positivos/negativos).

## Resumen

| Métrica | Valor |
|--------|------:|
| Archivos \`*.service.ts\` | ${serviceFiles.length} |
| Con \`*.service.spec.ts\` colocalizado | ${withSpec} |
| Sin spec de servicio | ${withoutSpec} |
| Entradas numeradas (huecos detectados) | ${totalGaps} |

---

`;

  const body = sections.join('\n');
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_MD, header + body, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Wrote ${rel(OUT_MD)} (${totalGaps} gap entries).`);
}

main();
