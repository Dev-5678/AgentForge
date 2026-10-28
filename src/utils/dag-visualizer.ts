/**
 * AgentForge - ASCII Workflow DAG Visualizer
 * 
 * @author Dev <https://github.com/Dev-5678>
 */

export class DAGVisualizer {
  public static renderWaves(waves: string[][]): string {
    let output = '\n=== AgentForge Execution Waves ===\n';
    waves.forEach((wave, idx) => {
      output += `  [Wave ${idx}] -> { ${wave.join(', ')} }\n`;
      if (idx < waves.length - 1) {
        output += '      ?\n';
      }
    });
    output += '==================================\n';
    return output;
  }
}
