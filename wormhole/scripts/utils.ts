import shell from 'shelljs';
import { blue, red } from "yoctocolors-cjs";


// New method to execute shell commands with logging
export const executeShellCommand = (command: string, cwd?: string) => {
  console.log(blue(`Executing command: ${command}`));
  const result = shell.exec(command, { cwd });
  if (result.code !== 0) {
    console.error(red('Error executing command:'), result.stderr);
    throw new Error(`Failed to execute command: ${command}`);
  }
  return result;
};