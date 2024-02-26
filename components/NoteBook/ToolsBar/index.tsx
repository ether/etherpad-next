import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  ListOrdered,
  List,
  Indent,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  RotateCcw,
  RotateCw,
  Image as ImageIcon,
} from 'lucide-react';
import Select from '@/components/Common/Select';
import styles from './index.module.css';
import type { FC } from 'react';

const colors = [
  {
    label: 'Default',
    value: 'default',
  },
  {
    label: 'Red',
    value: 'red-500',
    iconImage: <span className="size-4 bg-red-500" />,
  },
  {
    label: 'Green',
    value: 'green-500',
    iconImage: <span className="size-4 bg-green-500" />,
  },
  {
    label: 'Blue',
    value: 'blue-500',
    iconImage: <span className="size-4 bg-blue-500" />,
  },
];
const fonts = [
  { label: 'Arial', value: 'Arial' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Comic Sans MS', value: 'Comic Sans MS' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS' },
  { label: 'Arial Black', value: 'Arial Black' },
  { label: 'Impact', value: 'Impact' },
  { label: 'Lucida Console', value: 'Lucida Console' },
];

const ToolsBar: FC = () => (
  <header className={styles.toolsBar}>
    <span className={styles.actionGroup}>
      <button>
        <Bold />
      </button>
      <button>
        <Italic />
      </button>
      <button>
        <Underline />
      </button>
      <button>
        <Strikethrough />
      </button>
    </span>
    <span className={styles.actionGroup}>
      <button>
        <List />
      </button>
      <button>
        <ListOrdered />
      </button>
      <button>
        <Indent />
      </button>
      <button>
        <Indent className="rotate-180" />
      </button>
    </span>
    <span className={styles.actionGroup}>
      <button>
        <RotateCcw />
      </button>
      <button>
        <RotateCw />
      </button>
    </span>
    <button>
      <ImageIcon />
    </button>
    <span className={styles.actionGroup}>
      <Select
        values={colors}
        defaultValue="red-500"
        placeholder="Color"
        inline
      />
      <Select values={fonts} defaultValue="Arial" placeholder="Font" inline />
    </span>
    <span className={styles.actionGroup}>
      <button>
        <AlignLeft />
      </button>
      <button>
        <AlignCenter />
      </button>
      <button>
        <AlignRight />
      </button>
      <button>
        <AlignJustify />
      </button>
    </span>
  </header>
);

export default ToolsBar;
