import shell from 'shelljs';
import { blue, red } from "yoctocolors-cjs";


// New method to execute shell commands with logging
export interface ExecuteShellCommandOptions {
  cwd?: string;
  silent?: boolean;
}

export const executeShellCommand = (command: string, options: ExecuteShellCommandOptions = {}) => {
  const { cwd, silent = false } = options;
  if (!silent) {
    console.log(blue(`Executing command: ${command}`));
  }
  const result = shell.exec(command, { cwd, silent });
  if (result.code !== 0) {
    console.error(red('Error executing command:'), result.stderr);
    throw new Error(`Failed to execute command: ${command}`);
  }
  if (!silent) {
    console.log(result.stdout);
  }
  return result;
};


// Update the buildExecuteShellCommand function
export const buildExecuteShellCommand = (options: ExecuteShellCommandOptions) => {
  return (command: string, opts: ExecuteShellCommandOptions = {}) => 
    executeShellCommand(command, { ...options, ...opts });
}

