import { Component, OnDestroy } from '@angular/core';
import {
  AngularFireStorage,
  AngularFireUploadTask,
} from '@angular/fire/compat/storage';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { v4 as uuid } from 'uuid';
import { last, switchMap } from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import { ClipService } from 'src/app/services/clip.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css'],
})
export class UploadComponent implements OnDestroy {
  isDragover = false;
  file: File | null = null;
  nextStep = false;
  showAlert = false;
  alertMsg = 'Please wait! Your clip is being uploaded.';
  alertColor = 'blue';
  inSubmission = false;
  showPercentage = false;
  percentage = 0;
  user: firebase.User | null = null;
  task?: AngularFireUploadTask;

  title = new FormControl('', [Validators.required, Validators.minLength(3)]);
  uploadForm = new FormGroup({
    title: this.title,
  });
  constructor(
    private storage: AngularFireStorage,
    private auth: AngularFireAuth,
    private clipService: ClipService,
    private router: Router
  ) {
    auth.user.subscribe((user) => (this.user = user));
  }
  ngOnDestroy(): void {
    this.task?.cancel();
  }

  storeFile($event: Event) {
    this.isDragover = false;
    this.file = ($event as DragEvent).dataTransfer
      ? ($event as DragEvent).dataTransfer?.files.item(0) ?? null
      : ($event.target as HTMLInputElement).files?.item(0) ?? null;
    if (!this.file || this.file.type !== 'video/mp4') {
      return;
    }

    this.title.setValue(this.file.name.replace(/\.[^/.]+$/, ''));
    this.nextStep = true;
  }

  uploadFile() {
    //by calling this function. All controls within a group are disabled.
    this.uploadForm.disable();

    //set alert msg and disable submission button
    this.showAlert = true;
    this.alertMsg = 'Please wait! Your clip is being uploaded.';
    this.alertColor = 'blue';
    this.inSubmission = true;
    this.showPercentage = true;

    //use the library uuid to give de clip a unique id and include it in the path
    const clipFileName = uuid();
    const clipPath = `clips/${clipFileName}.mp4`;

    //upload the file to firebase
    this.task = this.storage.upload(clipPath, this.file);

    //create a ref to access the clip
    const clipRef = this.storage.ref(clipPath);

    this.task
      .percentageChanges()
      .subscribe((progress) => (this.percentage = (progress as number) / 100));

    //Save the other data from the clip in the database
    this.task
      .snapshotChanges()
      .pipe(
        last(),
        switchMap(() => clipRef.getDownloadURL())
      )
      .subscribe({
        next: async (url) => {
          const clip = {
            uid: this.user?.uid as string,
            displayName: this.user?.displayName as string,
            title: this.title.value,
            fileName: `${clipFileName}.mp4`,
            url,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          };

          const clipDocRef = await this.clipService.createClip(clip);

          this.alertColor = 'green';
          this.alertMsg =
            'Success! Your clip is now ready to share with the world';
          this.showPercentage = false;

          //timeout para que el usuario vea el msj de success antes de redirigirlo.
          setTimeout(() => {
            this.router.navigate(['clip', clipDocRef.id]);
          }, 1000);
        },
        error: (error) => {
          //It'll enable the controls from within a group.
          this.uploadForm.enable();
          this.alertColor = 'red';
          this.alertMsg = 'Upload failed! Try again later';
          this.inSubmission = false;
          this.showPercentage = false;
          console.error(error);
        },
      });
  }
}
