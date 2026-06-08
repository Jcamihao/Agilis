import { NgModule } from '@angular/core';
import { ToastContainerComponent } from './components/toast/toast-container.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { AvatarComponent } from './components/avatar/avatar.component';
import { CommentSectionComponent } from './components/comment-section/comment-section.component';

@NgModule({
  imports: [
    ToastContainerComponent,
    ConfirmDialogComponent,
    AvatarComponent,
    CommentSectionComponent,
  ],
  exports: [
    ToastContainerComponent,
    ConfirmDialogComponent,
    AvatarComponent,
    CommentSectionComponent,
  ],
})
export class SharedModule {}
