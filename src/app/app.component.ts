import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MtxDialog } from '@ng-matero/extensions/dialog';
import Crunker from 'crunker';
import { from, map, mergeMap, tap, toArray } from 'rxjs';
function generateList(fileList: FileList) {
  return from(fileList).pipe(
    mergeMap((file) => {
      return from(file.arrayBuffer()).pipe(
        map((arrayBuffer) => ({ arrayBuffer, file }))
      );
    }),
    mergeMap(({ arrayBuffer, file }) => {
      return from(crypto.subtle.digest('SHA-1', arrayBuffer)).pipe(
        map((digest) => {
          const hash = [...new Uint8Array(digest)]
            .map((x) => x.toString(16).padStart(2, '0'))
            .join('');
          return { hash, file };
        })
      );
    })
  );
}

function mergeMusic(music_list: MusicItem[]) {
  const crunker = new Crunker();
  const fileList = music_list.flatMap(({ file }, index) => [
    `/assets/question/question-${index + 1}.mp3`,
    file,
  ]);
  crunker
    .fetchAudio(...fileList)
    .then((buffer) => {
      return crunker.concatAudio(buffer.map((a) => crunker.padAudio(a, 1, 1)));
    })
    .then((concated) => {
      return crunker.export(concated, 'audio/mp3');
    })
    .then((output) => {
      crunker.download(output.blob);
      console.log(output.url);
    });
}

interface MusicItem {
  hash: string;
  file: File;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  @ViewChild('fileInput') file_input?: ElementRef<HTMLInputElement>;
  @ViewChild('audio') audio?: ElementRef<HTMLAudioElement>;
  @ViewChild('audioSource') audioSource?: ElementRef<HTMLSourceElement>;

  public music_list: MusicItem[] = [];

  constructor(private _snackBar: MatSnackBar, private mtxDialog: MtxDialog) {}

  public handleClickUpload() {
    const fileInput = this.file_input;
    if (fileInput) {
      fileInput.nativeElement.value = '';
      fileInput.nativeElement.click();
    }
  }

  public handleInputChange() {
    const inputEle = this.file_input?.nativeElement;
    if (inputEle) {
      const files = inputEle.files;
      if (files) {
        generateList(files).subscribe((result) => {
          if (this.music_list.find(({ hash }) => hash === result.hash)) {
            this._snackBar.open(`${result.file.name}文件重复`, 'done', {
              duration: 2000,
            });
          } else {
            this.music_list.push(result);
          }
        });
      }
    }
  }

  public handleClickConcat() {
    if (this.music_list.length) {
      mergeMusic(this.music_list);
    }
  }

  public handleSortList() {
    this.mtxDialog.confirm('是否按照文件名排序列表?', '', () => {
      this.music_list = this.music_list.sort((x, y) =>
        x.file.name.localeCompare(y.file.name)
      );
    });
  }

  public handleDeleteAll() {
    this.mtxDialog.confirm('是否清空题目列表?', '', () => {
      this.music_list = [];
    });
  }

  public handleDrop(event: CdkDragDrop<MusicItem[]>) {
    moveItemInArray(this.music_list, event.previousIndex, event.currentIndex);
  }

  public handlePlayMusic(file: File) {
    if (this.audio && this.audioSource) {
      const audio = this.audio.nativeElement;
      this.audioSource.nativeElement.setAttribute(
        'src',
        URL.createObjectURL(file)
      );
      setTimeout(() => {
        audio.load();
        audio.play();
      }, 1000);
    }
  }
}
