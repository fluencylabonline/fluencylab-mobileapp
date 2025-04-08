export type Notebook = {
    studentName: string;
    id: string;
    title: string;
    description: string;
    createdAt: any;
    student: string;
    content: any;
}

export type Report = {
    nome: string;
    idioma: string;
    preferedDayTime: string;
    cronograma: string;
    report: string;
    createdAt: any;
    addedToStudentName?: string;
  }

  export type Aluno = {
    id: string;
    CNPJ: string;
    name: string;
    professor: string;
    professorId: string;
    mensalidade: number;
    idioma: string;
    payments: any;
    studentMail: string;
    comecouEm: string;
    encerrouEm?: string;
    diaAula: string;
    status: string;
    classes: boolean;
    userName: string;
    profilePictureURL: any;
    diaPagamento: any;
    relatorioDeAula?: Report;
  }

  export interface VocabularyItem {
    vocab: string; // Make sure this matches the actual field name in your data
    translation?: string; // Optional fields
    imageURL?: string;   // Optional or required depending on your games
    // Add any other fields present in your VocabularyGame documents' vocabularies array
    id?: string; // Often useful if items have unique IDs
    hint?: string;
    // ... etc.
  }