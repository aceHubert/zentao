# Installation

Install the package globally to make the `zentao` command available. You only
need to do this the first time you use it.

```sh
npm i @ace-zentao/mcp@latest -g
zentao --version # check if install worked
```

## Troubleshooting

- **Command not found:** If `zentao` is not recognized, ensure your global npm
  `bin` directory is in your system's `PATH`. Restart your terminal or source
  your shell configuration file, such as `.bashrc` or `.zshrc`.
- **Permission errors:** If you encounter `EACCES` or permission errors during
  installation, avoid using `sudo`. Instead, use a node version manager like
  `nvm`, or configure npm to use a different global directory.
- **Old version running:** Run `npm uninstall -g @ace-zentao/mcp` before
  reinstalling, or ensure the latest version is being picked up by your path.
