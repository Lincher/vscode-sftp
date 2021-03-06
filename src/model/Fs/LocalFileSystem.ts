import * as fs from 'fs';
import * as fse from 'fs-extra';
import FileSystem, { IFileEntry, IStats, IStreamOption } from './FileSystem';

export default class LocalFileSystem extends FileSystem {
  constructor(pathResolver: any) {
    super(pathResolver);
  }

  lstat(path: string): Promise<IStats> {
    return new Promise((resolve, reject) => {
      fs.lstat(path, (err, stat) => {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          ...stat,
          type: FileSystem.getFileTypecharacter(stat),
          permissionMode: stat.mode & parseInt('777', 8), // tslint:disable-line:no-bitwise
        } as IStats);
      });
    });
  }

  get(path, option): Promise<fs.ReadStream> {
    return new Promise((resolve, reject) => {
      try {
        const stream = fs.createReadStream(path, option);
        resolve(stream);
      } catch (err) {
        reject(err);
      }
    });
  }

  put(input: fs.ReadStream | Buffer, path, option?: IStreamOption): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const stream = fs.createWriteStream(path, option);

      stream.on('error', err => {
        reject(err);
      });
      stream.on('finish', _ => {
        resolve();
      });

      if (input instanceof Buffer) {
        stream.end(input);
        return;
      }

      input.on('error', reject);
      input.pipe(stream);
    });
  }

  readlink(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readlink(path, (err, linkString) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(linkString);
      });
    });
  }

  symlink(targetPath: string, path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.symlink(targetPath, path, null, err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  mkdir(dir: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.mkdir(dir, err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  ensureDir(dir: string): Promise<void> {
    return fse.ensureDir(dir);
  }

  toFileEntry(fullPath, stat) {
    return {
      fspath: fullPath,
      name: this.pathResolver.basename(fullPath),
      type: stat.type,
      size: stat.size,
      modifyTime: stat.mtime.getTime() / 1000,
      accessTime: stat.atime.getTime() / 1000,
    };
  }

  list(dir: string): Promise<IFileEntry[]> {
    return new Promise((resolve, reject) => {
      fs.readdir(dir, (err, files) => {
        if (err) {
          reject(err);
          return;
        }

        const fileStatus = files.map(file => {
          const fspath = this.pathResolver.join(dir, file);
          return this.lstat(fspath)
            .then(stat => this.toFileEntry(fspath, stat));
        });

        resolve(Promise.all(fileStatus));
      });
    });
  }

  unlink(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.unlink(path, err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  rmdir(path: string, recursive: boolean): Promise<void> {
    if (recursive) {
      return fse.remove(path);
    }

    return new Promise<void>((resolve, reject) => {
      fs.rmdir(path, err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }
}
