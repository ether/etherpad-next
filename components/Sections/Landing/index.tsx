import Button from '@/components/Common/Button';
import BluredBackground from '@/components/Common/Background';
import Input from '@/components/Common/Input';
import style from './index.module.css';
import type { FC } from 'react';
import Editor from '@/components/NoteBook/Editor';

const Landing: FC = () => (
  <>
    <BluredBackground />
    <main className={style.landing}>
      <p>Create or open a new note book named:</p>
      <p className={style.note}>
        If you keep the note book name empty, it will create a random name for
        you.
      </p>
      <form>
        <Input name="note-book-name" placeholder="Note Book Name" type="text" />
        <Button type="submit">Create New Note Book</Button>
        <Editor ></Editor>
      </form>
    </main>
  </>
);

export default Landing;
